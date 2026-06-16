import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateSocialSecurity } from '@/lib/calculations'

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

    const m = parseInt(month)
    const y = parseInt(year)

    // ดึงข้อมูลเงินสมทบประกันสังคมของเดือน/ปีที่เลือก
    const contributions = await prisma.socialSecurityContribution.findMany({
      where: { month: m, year: y },
    })

    // ถ้าพนักงานคนไหนไม่มี record เดือนนี้ → ดึงจากเดือนก่อนหน้าล่าสุด (carry forward)
    const empIdsWithRecord = new Set(contributions.map((c) => c.employeeId))
    const empIdsWithoutRecord = employees
      .filter((e) => !empIdsWithRecord.has(e.id))
      .map((e) => e.id)

    let previousContributions: typeof contributions = []
    if (empIdsWithoutRecord.length > 0) {
      const allPrevious = await prisma.socialSecurityContribution.findMany({
        where: {
          employeeId: { in: empIdsWithoutRecord },
          OR: [
            { year: { lt: y } },
            { year: y, month: { lt: m } },
          ],
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      })
      const seen = new Set<number>()
      for (const rec of allPrevious) {
        if (!seen.has(rec.employeeId)) {
          seen.add(rec.employeeId)
          previousContributions.push(rec)
        }
      }
    }

    // รวมข้อมูลพนักงานกับเงินสมทบ
    const employeesWithContributions = employees.map((emp) => {
      const contribution = contributions.find((c) => c.employeeId === emp.id)
      const prev = !contribution ? previousContributions.find((p) => p.employeeId === emp.id) : null

      if (contribution) {
        return {
          ...emp,
          contributionId: contribution.id,
          amount: Number(contribution.amount),
          isCarriedForward: false,
        }
      } else if (prev && Number(prev.amount) > 0) {
        // carry forward จากเดือนก่อน (แสดงว่าเปิดอยู่)
        return {
          ...emp,
          contributionId: null,
          amount: Number(prev.amount),
          isCarriedForward: true,
        }
      } else {
        return {
          ...emp,
          contributionId: null,
          amount: 0,
          isCarriedForward: false,
        }
      }
    })

    // คำนวณยอดรวมจาก DB
    const totalAmount = contributions.reduce(
      (sum, c) => sum + Number(c.amount),
      0
    )
    const buildingCount = 3
    const amountPerBuilding = totalAmount / buildingCount

    // คำนวณยอดรวมจาก effectiveSalary (auto) สำหรับพนักงานที่มี contribution > 0
    const monthlySalaries = await prisma.monthlySalary.findMany({
      where: { month: parseInt(month), year: parseInt(year) },
    })
    const allEmployees = await prisma.employee.findMany({
      where: { isActive: true },
    })
    const msMap = new Map(monthlySalaries.map((ms) => [ms.employeeId, Number(ms.salary)]))

    let calculatedTotal = 0
    employeesWithContributions.forEach((emp) => {
      if (emp.amount > 0) {
        const effectiveSalary = msMap.get(emp.id) ?? Number(allEmployees.find((e) => e.id === emp.id)?.salary || 0)
        calculatedTotal += calculateSocialSecurity(effectiveSalary)
      }
    })
    const calculatedPerBuilding = calculatedTotal / buildingCount

    return NextResponse.json({
      employees: employeesWithContributions,
      totalAmount,
      amountPerBuilding,
      calculatedTotal,
      calculatedPerBuilding,
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

    // หมายเหตุ: ต้องบันทึกค่า 0 ไว้จริงๆ (ไม่ลบ record) เพื่อระบุชัดเจนว่า
    // "เดือนนี้ปิดประกันสังคม" — ป้องกัน carry forward ไปดึงค่าเดือนก่อนมาแสดงว่าเปิดอยู่
    if (existing) {
      // อัปเดต (รวมถึงกรณีปิด → amount = 0)
      contribution = await prisma.socialSecurityContribution.update({
        where: { id: existing.id },
        data: { amount: parseFloat(amount) },
      })
    } else {
      // สร้างใหม่ (รวมถึงกรณีปิด → amount = 0 เพื่อหยุด carry forward)
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
    const buildingCount = 3
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
