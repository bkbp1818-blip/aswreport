import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'
import { randomUUID } from 'crypto'

const ELIGIBLE_BUILDING_CODES = ['CT', 'YW', 'NANA']

// POST - บันทึกค่าแรงวันหยุดชดเชย
// body: { employeeId, holidayIds[], month, year }
// สร้าง 3 ExpenseHistory records (CT, YW, NANA) พร้อม groupId เดียวกัน
export async function POST(request: NextRequest) {
  try {
    await requireMenuAccess('/transactions')

    const body = await request.json()
    const { employeeId, holidayIds, month, year } = body

    if (!employeeId || !Array.isArray(holidayIds) || holidayIds.length === 0 || !month || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุ employeeId, holidayIds, month, year' },
        { status: 400 }
      )
    }

    const empId = parseInt(employeeId)
    const m = parseInt(month)
    const y = parseInt(year)
    const hIds = holidayIds.map((id: number | string) => parseInt(String(id)))

    // 1) ดึงพนักงาน
    const employee = await prisma.employee.findUnique({
      where: { id: empId },
      select: {
        id: true, firstName: true, lastName: true, nickname: true,
        position: true, salary: true, isActive: true,
      },
    })
    if (!employee || !employee.isActive) {
      return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })
    }
    if (employee.position === 'PARTNER') {
      return NextResponse.json({ error: 'พนักงานตำแหน่งหุ้นส่วนไม่มีค่าแรงวันหยุดชดเชย' }, { status: 400 })
    }

    // 2) หา effectiveSalary ของเดือน/ปี (carry forward จากเดือนก่อนล่าสุด)
    const monthlyRecord = await prisma.monthlySalary.findUnique({
      where: { employeeId_month_year: { employeeId: empId, month: m, year: y } },
    })

    let effectiveSalary: number
    if (monthlyRecord) {
      effectiveSalary = Number(monthlyRecord.salary)
    } else {
      const previous = await prisma.monthlySalary.findFirst({
        where: {
          employeeId: empId,
          OR: [{ year: { lt: y } }, { year: y, month: { lt: m } }],
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      })
      effectiveSalary = previous ? Number(previous.salary) : Number(employee.salary)
    }

    if (effectiveSalary <= 0) {
      return NextResponse.json({ error: 'พนักงานคนนี้ไม่มีเงินเดือน' }, { status: 400 })
    }

    // 3) ดึง holidays
    const holidays = await prisma.holiday.findMany({
      where: { id: { in: hIds } },
      orderBy: { date: 'asc' },
    })
    if (holidays.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการวันหยุดที่เลือก' }, { status: 400 })
    }

    // 4) ดึง 3 อาคาร CT/YW/NANA
    const buildings = await prisma.building.findMany({
      where: { code: { in: ELIGIBLE_BUILDING_CODES } },
    })
    if (buildings.length !== ELIGIBLE_BUILDING_CODES.length) {
      return NextResponse.json({ error: 'ไม่พบอาคาร CT/YW/NANA ครบทั้ง 3 อาคาร' }, { status: 500 })
    }

    // 5) คำนวณ
    const days = holidays.length
    const totalAllBuildings = (effectiveSalary / 30) * days * 2
    const perBuilding = totalAllBuildings / buildings.length

    // 6) สร้าง description (snapshot)
    const empDisplayName = employee.nickname || `${employee.firstName} ${employee.lastName}`.trim()
    const formatDate = (d: Date) => {
      const dd = d.getUTCDate()
      const mm = d.getUTCMonth() + 1
      return `${dd}/${mm}`
    }
    const holidayLabels = holidays.map(h => `${h.name} ${formatDate(h.date)}`).join(', ')
    const description = `${empDisplayName} | ${holidayLabels} (${days} วัน) | ${effectiveSalary.toLocaleString()}÷30×${days}×2 = ${totalAllBuildings.toFixed(2)} ÷ ${buildings.length} = ${perBuilding.toFixed(2)}`

    const groupId = randomUUID()
    const fieldName = 'holidayCompensation'
    const fieldLabel = 'ค่าแรงวันหยุดชดเชย'

    // 7) บันทึก 3 records ใน transaction
    const records = await prisma.$transaction(
      buildings.map(b =>
        prisma.expenseHistory.create({
          data: {
            targetType: 'SETTINGS',
            targetId: b.id,
            fieldName,
            fieldLabel,
            actionType: 'ADD',
            amount: perBuilding,
            description,
            month: m,
            year: y,
            groupId,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      groupId,
      totalAllBuildings,
      perBuilding,
      records,
    })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error creating holiday compensation:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึก' }, { status: 500 })
  }
}
