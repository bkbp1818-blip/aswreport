import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/auth'

// GET - ดึงรายชื่อพนักงานที่ใช้ในการจ่ายค่าแรงวันหยุดชดเชยได้
// คืน salaries: { [month]: salary } ของแต่ละเดือนในปีที่ระบุ (skip 0 + carry forward จากเดือนก่อนล่าสุดที่ > 0)
// query: ?year=
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    if (!yearParam) {
      return NextResponse.json({ error: 'กรุณาระบุ year' }, { status: 400 })
    }
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

    const employeeIds = employees.map(e => e.id)
    if (employeeIds.length === 0) {
      return NextResponse.json({ employees: [], year: y })
    }

    // ดึง MonthlySalary ทั้งหมดของพนักงานเหล่านี้ ที่ salary > 0 (จากปีที่ระบุและก่อนหน้า)
    const allSalaryRecords = await prisma.monthlySalary.findMany({
      where: {
        employeeId: { in: employeeIds },
        salary: { gt: 0 },
        OR: [{ year: { lt: y } }, { year: y }],
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })

    // group ตาม employeeId แล้วเรียงตามเวลา (เก่า → ใหม่)
    const salaryByEmployee = new Map<number, { month: number; year: number; salary: number }[]>()
    for (const r of allSalaryRecords) {
      const arr = salaryByEmployee.get(r.employeeId) || []
      arr.push({ month: r.month, year: r.year, salary: Number(r.salary) })
      salaryByEmployee.set(r.employeeId, arr)
    }

    // สำหรับแต่ละ employee: คำนวณ effectiveSalary ของแต่ละเดือน 1-12 ของปี y
    // - ถ้ามี record ใน month-y และ salary > 0 → ใช้ค่านั้น (sourceMonth = month, sourceYear = y)
    // - ถ้าไม่มี → ดึง record ล่าสุดก่อน month-y ที่ salary > 0 (carry forward)
    // - ถ้าไม่มีเลย → ใช้ Employee.salary (default)
    const result = employees.map(emp => {
      const records = salaryByEmployee.get(emp.id) || []
      const defaultSalary = Number(emp.salary)

      const salaries: Record<number, { salary: number; sourceMonth: number | null; sourceYear: number | null; isCarriedForward: boolean }> = {}

      for (let m = 1; m <= 12; m++) {
        // หา record ล่าสุดที่ (year < y) หรือ (year = y และ month <= m)
        let chosen: { month: number; year: number; salary: number } | null = null
        for (let i = records.length - 1; i >= 0; i--) {
          const r = records[i]
          if (r.year < y || (r.year === y && r.month <= m)) {
            chosen = r
            break
          }
        }
        if (chosen) {
          salaries[m] = {
            salary: chosen.salary,
            sourceMonth: chosen.month,
            sourceYear: chosen.year,
            isCarriedForward: !(chosen.month === m && chosen.year === y),
          }
        } else {
          salaries[m] = {
            salary: defaultSalary,
            sourceMonth: null,
            sourceYear: null,
            isCarriedForward: false,
          }
        }
      }

      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        nickname: emp.nickname,
        position: emp.position,
        defaultSalary,
        salaries,
      }
    })

    return NextResponse.json({ employees: result, year: y })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching eligible employees:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน' }, { status: 500 })
  }
}
