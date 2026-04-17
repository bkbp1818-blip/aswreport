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

    // ดึงข้อมูลเงินเดือนรายเดือนของเดือน/ปีที่เลือก
    const monthlySalaries = await prisma.monthlySalary.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
      },
    })

    // รวมข้อมูลพนักงานกับเงินเดือนรายเดือน
    const employeesWithMonthlySalary = employees.map((emp) => {
      const ms = monthlySalaries.find((m) => m.employeeId === emp.id)
      const defaultSalary = Number(emp.salary)
      const monthlySalary = ms ? Number(ms.salary) : null
      return {
        ...emp,
        salary: defaultSalary,
        monthlySalaryId: ms?.id || null,
        monthlySalary,
        effectiveSalary: monthlySalary !== null ? monthlySalary : defaultSalary,
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

// POST - บันทึกหรืออัปเดตเงินเดือนรายเดือน
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, salary, month, year } = body

    if (!employeeId || salary === undefined || !month || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่ามีอยู่แล้วหรือไม่
    const existing = await prisma.monthlySalary.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: parseInt(employeeId),
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    })

    let monthlySalary

    if (existing) {
      if (parseFloat(salary) === 0) {
        // ถ้าจำนวนเป็น 0 ให้ลบออก (กลับไปใช้ค่า default)
        await prisma.monthlySalary.delete({
          where: { id: existing.id },
        })
        monthlySalary = null
      } else {
        monthlySalary = await prisma.monthlySalary.update({
          where: { id: existing.id },
          data: { salary: parseFloat(salary) },
        })
      }
    } else if (parseFloat(salary) > 0) {
      // สร้างใหม่ (เฉพาะถ้าจำนวนมากกว่า 0)
      monthlySalary = await prisma.monthlySalary.create({
        data: {
          employeeId: parseInt(employeeId),
          salary: parseFloat(salary),
          month: parseInt(month),
          year: parseInt(year),
        },
      })
    }

    // ดึงยอดรวมใหม่
    const allMonthlySalaries = await prisma.monthlySalary.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
      },
    })

    // ดึงพนักงานทั้งหมดเพื่อคำนวณ effective salary
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
      monthlySalary,
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
