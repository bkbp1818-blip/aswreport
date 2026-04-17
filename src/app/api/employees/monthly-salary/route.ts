import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - ดึงข้อมูลเงินเดือนรายเดือนตามเดือน/ปี พร้อมรายชื่อพนักงาน
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!month || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุ month และ year' },
        { status: 400 }
      )
    }

    // ดึงพนักงานทั้งหมดที่ยังทำงานอยู่
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      orderBy: [
        { position: 'asc' },
        { firstName: 'asc' },
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nickname: true,
        position: true,
        salary: true,
      },
    })

    const m = parseInt(month)
    const y = parseInt(year)

    // ดึงข้อมูลเงินเดือนรายเดือนของเดือน/ปีที่เลือก
    const monthlySalaries = await prisma.monthlySalary.findMany({
      where: { month: m, year: y },
    })

    // ถ้าพนักงานคนไหนไม่มี record เดือนนี้ → ดึงจากเดือนก่อนหน้าล่าสุด (carry forward)
    const employeeIdsWithRecord = new Set(monthlySalaries.map((ms) => ms.employeeId))
    const employeeIdsWithoutRecord = employees
      .filter((e) => !employeeIdsWithRecord.has(e.id))
      .map((e) => e.id)

    let previousRecords: typeof monthlySalaries = []
    if (employeeIdsWithoutRecord.length > 0) {
      // ดึง record ล่าสุดก่อนเดือนนี้ สำหรับพนักงานที่ไม่มี record เดือนนี้
      const allPrevious = await prisma.monthlySalary.findMany({
        where: {
          employeeId: { in: employeeIdsWithoutRecord },
          OR: [
            { year: { lt: y } },
            { year: y, month: { lt: m } },
          ],
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      })
      // เอาเฉพาะ record ล่าสุดต่อคน
      const seen = new Set<number>()
      for (const rec of allPrevious) {
        if (!seen.has(rec.employeeId)) {
          seen.add(rec.employeeId)
          previousRecords.push(rec)
        }
      }
    }

    // รวมข้อมูลพนักงานกับเงินเดือนรายเดือน
    const employeesWithMonthlySalary = employees.map((emp) => {
      const ms = monthlySalaries.find((ms) => ms.employeeId === emp.id)
      const prev = !ms ? previousRecords.find((p) => p.employeeId === emp.id) : null
      const defaultSalary = Number(emp.salary)

      if (ms) {
        // มี record เดือนนี้
        const monthlySalary = Number(ms.salary)
        return {
          ...emp, salary: defaultSalary,
          monthlySalaryId: ms.id, monthlySalary,
          effectiveSalary: monthlySalary,
          isCarriedForward: false,
        }
      } else if (prev) {
        // ดึงจากเดือนก่อน (carry forward)
        const carriedSalary = Number(prev.salary)
        return {
          ...emp, salary: defaultSalary,
          monthlySalaryId: null, monthlySalary: carriedSalary,
          effectiveSalary: carriedSalary,
          isCarriedForward: true,
        }
      } else {
        // ไม่มี record เลย → ใช้ค่า default
        return {
          ...emp, salary: defaultSalary,
          monthlySalaryId: null, monthlySalary: null,
          effectiveSalary: defaultSalary,
          isCarriedForward: false,
        }
      }
    })

    // คำนวณยอดรวมและหาร 3 อาคาร (CT, YW, NANA)
    const totalSalary = employeesWithMonthlySalary.reduce(
      (sum, emp) => sum + emp.effectiveSalary,
      0
    )
    const buildingCount = 3
    const salaryPerBuilding = totalSalary / buildingCount

    return NextResponse.json({
      employees: employeesWithMonthlySalary,
      totalSalary,
      salaryPerBuilding,
      buildingCount,
      month: parseInt(month),
      year: parseInt(year),
    })
  } catch (error) {
    console.error('Error fetching monthly salaries:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินเดือนรายเดือน' },
      { status: 500 }
    )
  }
}

// POST - บันทึกหรืออัปเดตเงินเดือนรายเดือน (รองรับทั้ง single และ batch)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // รองรับ batch: { items: [...], month, year }
    // หรือ single: { employeeId, salary, month, year }
    const isBatch = Array.isArray(body.items)
    const items = isBatch
      ? body.items as { employeeId: number; salary: number }[]
      : [{ employeeId: body.employeeId, salary: body.salary }]
    const month = parseInt(isBatch ? body.month : body.month)
    const year = parseInt(isBatch ? body.year : body.year)

    if (!month || !year || items.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // บันทึกทีละรายการ
    for (const item of items) {
      const empId = parseInt(String(item.employeeId))
      const salaryVal = parseFloat(String(item.salary))

      const existing = await prisma.monthlySalary.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: empId,
            month,
            year,
          },
        },
      })

      if (existing) {
        if (salaryVal < 0) {
          // salary = -1 → ลบ record (กลับไปใช้ค่า default)
          await prisma.monthlySalary.delete({ where: { id: existing.id } })
        } else {
          // salary >= 0 → อัปเดต (รวมถึง 0 = ปิดเงินเดือนเดือนนี้)
          await prisma.monthlySalary.update({
            where: { id: existing.id },
            data: { salary: salaryVal },
          })
        }
      } else if (salaryVal >= 0) {
        // สร้างใหม่ (รวมถึง 0 = ปิดเงินเดือนเดือนนี้)
        await prisma.monthlySalary.create({
          data: { employeeId: empId, salary: salaryVal, month, year },
        })
      }
    }

    // ดึงยอดรวมใหม่
    const allMonthlySalaries = await prisma.monthlySalary.findMany({
      where: { month, year },
    })

    const employees = await prisma.employee.findMany({
      where: { isActive: true },
    })

    const msMap = new Map(allMonthlySalaries.map((ms) => [ms.employeeId, Number(ms.salary)]))
    const totalSalary = employees.reduce((sum, emp) => {
      return sum + (msMap.get(emp.id) ?? Number(emp.salary))
    }, 0)
    const buildingCount = 3
    const salaryPerBuilding = totalSalary / buildingCount

    return NextResponse.json({
      success: true,
      savedCount: items.length,
      totalSalary,
      salaryPerBuilding,
    })
  } catch (error) {
    console.error('Error saving monthly salary:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเงินเดือนรายเดือน' },
      { status: 500 }
    )
  }
}
