import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - ดึงข้อมูลเงินเดือนรวมและหาร 5 อาคาร
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

    // นับจำนวนอาคาร
    const buildingCount = await prisma.building.count()

    // คำนวณเงินเดือนต่ออาคาร
    const salaryPerBuilding = buildingCount > 0 ? totalSalary / buildingCount : 0

    return NextResponse.json({
      employees: activeEmployees,
      totalSalary,
      buildingCount,
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
