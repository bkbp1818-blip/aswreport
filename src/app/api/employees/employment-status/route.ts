import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EmploymentStatus } from '@prisma/client'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'

// POST - เปลี่ยนสถานะพนักงาน (ป้ายถาวรที่ Employee) + sync isPaused ลงเดือนที่กำลังดู (one-shot)
//
// หลักการ (ตามที่ Bank อนุมัติ):
//  - เขียน isPaused "ครั้งเดียว" ตอนกดเปลี่ยนสถานะเท่านั้น — ไม่ใช่บังคับทุกครั้งที่โหลดหน้า
//  - toggle เปิด/ปิดรายเดือนเดิม ยัง override สถานะได้เสมอ (เขียน isPaused field ตัวเดียวกัน)
//  - RESIGNED → isPaused=true (หยุดคิดเงินตั้งแต่เดือนที่ดูเป็นต้นไป, carry-forward พาต่อ, เดือนเก่าไม่แตะ)
//  - ACTIVE / OUTSOURCE → isPaused=false (upsert record เดือนนี้เพื่อ override carry-forward จากเดือนก่อนที่อาจ paused)
//  - ไม่แตะ salary ที่ Bank กรอกไว้ (update เฉพาะ isPaused); ตอน create ใหม่ใช้ salary = ค่า default ของพนักงาน
//
// ไม่แตะ endpoint/สูตรคำนวณเดิมเลย — ระบบเดิมยังอ่าน isPaused เหมือนเดิม
export async function POST(request: NextRequest) {
  try {
    await requireMenuAccess('/employees')

    const body = await request.json()
    const { employeeId, status, month, year } = body

    // ตรวจ input
    const empId = parseInt(String(employeeId))
    const m = parseInt(String(month))
    const y = parseInt(String(year))
    const validStatuses: EmploymentStatus[] = ['ACTIVE', 'RESIGNED', 'OUTSOURCE']

    if (!empId || !m || !y || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'กรุณาระบุ employeeId, status (ACTIVE/RESIGNED/OUTSOURCE), month, year ให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // ดึงพนักงาน (ต้องมีจริง + ใช้ salary default ตอน create record ใหม่)
    const employee = await prisma.employee.findUnique({
      where: { id: empId },
      select: { id: true, salary: true },
    })
    if (!employee) {
      return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })
    }

    // RESIGNED = หยุดคิดเงิน (isPaused=true), ACTIVE/OUTSOURCE = คิดเงินปกติ (isPaused=false)
    const isPaused = status === 'RESIGNED'
    const defaultSalary = Number(employee.salary)

    // เขียนป้ายที่ Employee + sync isPaused ลงเดือนที่ดู พร้อมกันใน transaction
    await prisma.$transaction([
      prisma.employee.update({
        where: { id: empId },
        data: { employmentStatus: status as EmploymentStatus },
      }),
      prisma.monthlySalary.upsert({
        where: { employeeId_month_year: { employeeId: empId, month: m, year: y } },
        // มี record อยู่แล้ว → แตะเฉพาะ isPaused (ไม่ทำลาย salary ที่กรอกไว้)
        update: { isPaused },
        // ยังไม่มี record → สร้างใหม่ด้วย salary default ของพนักงาน
        create: { employeeId: empId, salary: defaultSalary, isPaused, month: m, year: y },
      }),
    ])

    return NextResponse.json({ success: true, employeeId: empId, status, isPaused, month: m, year: y })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error updating employment status:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะพนักงาน' },
      { status: 500 }
    )
  }
}
