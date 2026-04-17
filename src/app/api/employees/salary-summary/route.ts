import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
      // ถ้ามี month/year → ดึง MonthlySalary แล้ว fallback ไป Employee.salary
      const monthlySalaries = await prisma.monthlySalary.findMany({
        where: {
          month: parseInt(month),
          year: parseInt(year),
        },
      })
      const msMap = new Map(monthlySalaries.map((ms) => [ms.employeeId, Number(ms.salary)]))
      totalSalary = activeEmployees.reduce(
        (sum, emp) => sum + (msMap.get(emp.id) ?? Number(emp.salary)),
        0
      )
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
