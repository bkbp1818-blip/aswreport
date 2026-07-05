import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// gate ช่วงทำงานระดับเดือน (YYYY-MM) — ลอกมาจาก monthly-salary/route.ts ให้เหมือนเป๊ะ
//   startDate: เดือนที่เริ่มงาน = นับ · เดือนก่อนหน้า = ไม่นับ
//   endDate:   เดือนทำงานวันสุดท้าย = ยังนับ · เดือนถัดไป = ไม่นับ
//   null = ไม่จำกัดฝั่งนั้น
// ใช้ UTC + viewIdx (ปี*12 + เดือน 1-12) เทียบระดับเดือน — ตรงกับ monthly-salary
function isInWorkPeriod(
  emp: { startDate: Date | null; endDate: Date | null },
  viewIdx: number
): boolean {
  if (emp.startDate) {
    const startIdx = emp.startDate.getUTCFullYear() * 12 + (emp.startDate.getUTCMonth() + 1)
    if (viewIdx < startIdx) return false
  }
  if (emp.endDate) {
    const endIdx = emp.endDate.getUTCFullYear() * 12 + (emp.endDate.getUTCMonth() + 1)
    if (viewIdx > endIdx) return false
  }
  return true
}

// GET - ดึงข้อมูลเงินเดือนรวมและหาร 3 อาคาร (CT, YW, NANA)
// รองรับ optional month/year params เพื่อดึงเงินเดือนรายเดือน
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // ดึงพนักงานที่ยังทำงานอยู่
    const activeEmployees = await prisma.employee.findMany({
      where: { isActive: true },
      orderBy: [
        { position: 'asc' },
        { firstName: 'asc' },
      ],
    })

    let totalSalary: number

    if (month && year) {
      // ถ้ามี month/year → ดึง MonthlySalary เดือนนี้ แล้ว carry-forward + เช็ค isPaused
      // (logic เดียวกับ /api/employees/monthly-salary เพื่อให้เงินเดือนรวมตรงกันทุกเดือน)
      const m = parseInt(month)
      const y = parseInt(year)
      const viewIdx = y * 12 + m // ดัชนีเดือนที่กำลังดู สำหรับ gate ช่วงทำงาน

      // gate ช่วงทำงานที่ backend เหมือน monthly-salary: กรองคนนอกช่วงทิ้ง "ก่อน" carry-forward + reduce
      // → totalSalary / salaryPerBuilding ถูกอัตโนมัติ ตรงกับ monthly-salary ทุกเดือน
      const employees = activeEmployees.filter((e) => isInWorkPeriod(e, viewIdx))

      const monthlySalaries = await prisma.monthlySalary.findMany({
        where: { month: m, year: y },
      })

      // พนักงานที่ไม่มี record เดือนนี้ → หา record ล่าสุด "ก่อน" เดือนนี้ (carry-forward ข้ามหลายเดือนได้)
      const employeeIdsWithRecord = new Set(monthlySalaries.map((ms) => ms.employeeId))
      const employeeIdsWithoutRecord = employees
        .filter((e) => !employeeIdsWithRecord.has(e.id))
        .map((e) => e.id)

      let previousRecords: typeof monthlySalaries = []
      if (employeeIdsWithoutRecord.length > 0) {
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

      // รวมยอด: มี record เดือนนี้ (isPaused→0) → carry-forward (isPaused→0) → default (Employee.salary)
      totalSalary = employees.reduce((sum, emp) => {
        const ms = monthlySalaries.find((ms) => ms.employeeId === emp.id)
        const prev = !ms ? previousRecords.find((p) => p.employeeId === emp.id) : null
        let effectiveSalary: number
        if (ms) {
          effectiveSalary = ms.isPaused ? 0 : Number(ms.salary)
        } else if (prev) {
          effectiveSalary = prev.isPaused ? 0 : Number(prev.salary)
        } else {
          effectiveSalary = Number(emp.salary)
        }
        return sum + effectiveSalary
      }, 0)
    } else {
      // ถ้าไม่มี month/year → ใช้ Employee.salary ตรงๆ (backward compatible)
      totalSalary = activeEmployees.reduce(
        (sum, emp) => sum + Number(emp.salary),
        0
      )
    }

    // หาร 3 อาคาร (CT, YW, NANA) - ไม่รวม Funn D
    const salaryDivisor = 3
    const salaryPerBuilding = salaryDivisor > 0 ? totalSalary / salaryDivisor : 0

    return NextResponse.json({
      employees: activeEmployees,
      totalSalary,
      buildingCount: salaryDivisor,
      salaryPerBuilding,
    })
  } catch (error) {
    console.error('Error fetching salary summary:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการคำนวณเงินเดือน' },
      { status: 500 }
    )
  }
}
