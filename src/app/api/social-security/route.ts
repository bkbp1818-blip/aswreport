import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - ดึงข้อมูลเงินสมทบประกันสังคมตามเดือน/ปี พร้อมรายชื่อพนักงาน
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
      orderBy: { firstName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nickname: true,
        position: true,
      },
    })

    // ดึงข้อมูลเงินสมทบประกันสังคมของเดือน/ปีที่เลือก
    const contributions = await prisma.socialSecurityContribution.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
      },
    })

    // รวมข้อมูลพนักงานกับเงินสมทบ
    const employeesWithContributions = employees.map((emp) => {
      const contribution = contributions.find((c) => c.employeeId === emp.id)
      return {
        ...emp,
        contributionId: contribution?.id || null,
        amount: contribution ? Number(contribution.amount) : 0,
      }
    })

    // คำนวณยอดรวมและหาร 5 อาคาร
    const totalAmount = contributions.reduce(
      (sum, c) => sum + Number(c.amount),
      0
    )
    const buildingCount = 5
    const amountPerBuilding = totalAmount / buildingCount

    return NextResponse.json({
      employees: employeesWithContributions,
      totalAmount,
      amountPerBuilding,
      buildingCount,
      month: parseInt(month),
      year: parseInt(year),
    })
  } catch (error) {
    console.error('Error fetching social security contributions:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    )
  }
}

// POST - บันทึกหรืออัปเดตเงินสมทบประกันสังคม
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employeeId, amount, month, year } = body

    if (!employeeId || amount === undefined || !month || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่ามีอยู่แล้วหรือไม่
    const existing = await prisma.socialSecurityContribution.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: parseInt(employeeId),
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    })

    let contribution

    if (existing) {
      // อัปเดต
      if (parseFloat(amount) === 0) {
        // ถ้าจำนวนเป็น 0 ให้ลบออก
        await prisma.socialSecurityContribution.delete({
          where: { id: existing.id },
        })
        contribution = null
      } else {
        contribution = await prisma.socialSecurityContribution.update({
          where: { id: existing.id },
          data: { amount: parseFloat(amount) },
        })
      }
    } else if (parseFloat(amount) > 0) {
      // สร้างใหม่ (เฉพาะถ้าจำนวนมากกว่า 0)
      contribution = await prisma.socialSecurityContribution.create({
        data: {
          employeeId: parseInt(employeeId),
          amount: parseFloat(amount),
          month: parseInt(month),
          year: parseInt(year),
        },
      })
    }

    // ดึงยอดรวมใหม่
    const contributions = await prisma.socialSecurityContribution.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
      },
    })

    const totalAmount = contributions.reduce(
      (sum, c) => sum + Number(c.amount),
      0
    )
    const buildingCount = 5
    const amountPerBuilding = totalAmount / buildingCount

    return NextResponse.json({
      success: true,
      contribution,
      totalAmount,
      amountPerBuilding,
    })
  } catch (error) {
    console.error('Error saving social security contribution:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    )
  }
}
