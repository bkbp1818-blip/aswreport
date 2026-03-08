import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - ดึงข้อมูลเงินเดือนรวมและหาร 3 อาคาร (CT, YW, NANA)
export async function GET() {
  try {
    // ดึงพนักงานที่ยังทำงานอยู่
    const activeEmployees = await prisma.employee.findMany({
      where: { isActive: true },
      orderBy: [
        { position: 'asc' },
        { firstName: 'asc' },
      ],
    })

    // คำนวณเงินเดือนรวม
    const totalSalary = activeEmployees.reduce(
      (sum, emp) => sum + Number(emp.salary),
      0
    )

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
