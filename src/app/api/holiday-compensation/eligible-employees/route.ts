import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/auth'

// GET - ดึงรายชื่อพนักงานที่ใช้ในการจ่ายค่าแรงวันหยุดชดเชยได้
// คืน effectiveSalary แบบ "เงินเดือนล่าสุดที่ > 0" (skip 0 ที่ผู้ใช้ตั้งให้ปิดเงินเดือนเดือนนั้น)
// query: ?month=&year=
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')
    if (!monthParam || !yearParam) {
      return NextResponse.json({ error: 'กรุณาระบุ month และ year' }, { status: 400 })
    }
    const m = parseInt(monthParam)
    const y = parseInt(yearParam)

    // ดึงเฉพาะพนักงาน MAID/MANAGER ที่ active
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        position: { in: ['MAID', 'MANAGER'] },
      },
      orderBy: [{ position: 'asc' }, { firstName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, nickname: true, position: true, salary: true },
    })

    // ดึง record ล่าสุดที่ salary > 0 ของแต่ละคน (เดือนปัจจุบันหรือก่อนหน้า)
    const employeeIds = employees.map(e => e.id)
    const candidates = await prisma.monthlySalary.findMany({
      where: {
        employeeId: { in: employeeIds },
        salary: { gt: 0 },
        OR: [
          { year: { lt: y } },
          { year: y, month: { lte: m } },
        ],
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    const latestByEmployee = new Map<number, { salary: number; month: number; year: number }>()
    for (const c of candidates) {
      if (!latestByEmployee.has(c.employeeId)) {
        latestByEmployee.set(c.employeeId, { salary: Number(c.salary), month: c.month, year: c.year })
      }
    }

    const result = employees.map(emp => {
      const latest = latestByEmployee.get(emp.id)
      const defaultSalary = Number(emp.salary)
      const effectiveSalary = latest ? latest.salary : defaultSalary
      const isCarriedForward = !!latest && (latest.month !== m || latest.year !== y)
      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        nickname: emp.nickname,
        position: emp.position,
        effectiveSalary,
        salarySourceMonth: latest?.month ?? null,
        salarySourceYear: latest?.year ?? null,
        isCarriedForward,
      }
    })

    return NextResponse.json({ employees: result, month: m, year: y })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching eligible employees:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน' }, { status: 500 })
  }
}
