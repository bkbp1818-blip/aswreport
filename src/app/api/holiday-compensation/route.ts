import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireMenuAccess, handleAuthError } from '@/lib/auth'
import { randomUUID } from 'crypto'

const ELIGIBLE_BUILDING_CODES = ['CT', 'YW', 'NANA']

// GET - ดึงรายการการจ่ายค่าแรงวันหยุดชดเชย (group แบบ 1 entry ต่อ groupId)
// query: ?month=&year= (filter ตามเดือน/ปีที่ลง expense)
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    const where: { fieldName: string; month?: number; year?: number; groupId: { not: null } } = {
      fieldName: 'holidayCompensation',
      groupId: { not: null },
    }
    if (monthParam) where.month = parseInt(monthParam)
    if (yearParam) where.year = parseInt(yearParam)

    const records = await prisma.expenseHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // group ตาม groupId — เลือก record แรกของแต่ละ group มาเป็น representative
    // (records ใน group เดียวกันมี amount, description, month, year, createdAt เหมือนกัน — ต่างแค่ targetId)
    const grouped = new Map<string, {
      groupId: string
      description: string
      amount: number       // ยอดต่ออาคาร
      totalAmount: number  // ยอดรวมทุกอาคาร (amount * จำนวน records)
      month: number
      year: number
      createdAt: string
      buildingIds: number[]
      recordIds: number[]
    }>()

    for (const r of records) {
      if (!r.groupId) continue
      const existing = grouped.get(r.groupId)
      if (existing) {
        existing.totalAmount += Number(r.amount)
        existing.recordIds.push(r.id)
        if (r.targetId !== null) existing.buildingIds.push(r.targetId)
      } else {
        grouped.set(r.groupId, {
          groupId: r.groupId,
          description: r.description,
          amount: Number(r.amount),
          totalAmount: Number(r.amount),
          month: r.month,
          year: r.year,
          createdAt: r.createdAt.toISOString(),
          buildingIds: r.targetId !== null ? [r.targetId] : [],
          recordIds: [r.id],
        })
      }
    }

    const items = Array.from(grouped.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    )

    return NextResponse.json({ items })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error listing holiday compensation:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 })
  }
}

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

    // 2) ดึง holidays
    const holidays = await prisma.holiday.findMany({
      where: { id: { in: hIds } },
      orderBy: { date: 'asc' },
    })
    if (holidays.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการวันหยุดที่เลือก' }, { status: 400 })
    }

    // 3) ดึง MonthlySalary ทั้งหมดของพนักงาน (เฉพาะที่ salary > 0)
    //    เพื่อใช้ lookup salary ตามเดือน/ปีของแต่ละวันหยุด (skip 0 + carry forward จากเดือนก่อนหน้าล่าสุดที่ > 0)
    const allSalaryRecords = await prisma.monthlySalary.findMany({
      where: { employeeId: empId, salary: { gt: 0 } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })
    const defaultSalary = Number(employee.salary)

    // helper: หา effectiveSalary ของ (month, year) → record ล่าสุดที่ salary > 0 และไม่เกิน month/year นั้น
    const lookupSalary = (mm: number, yy: number): number => {
      let chosen: { month: number; year: number; salary: number } | null = null
      for (const r of allSalaryRecords) {
        if (r.year < yy || (r.year === yy && r.month <= mm)) {
          chosen = { month: r.month, year: r.year, salary: Number(r.salary) }
        } else {
          break
        }
      }
      return chosen ? chosen.salary : defaultSalary
    }

    // 4) ดึง 3 อาคาร CT/YW/NANA
    const buildings = await prisma.building.findMany({
      where: { code: { in: ELIGIBLE_BUILDING_CODES } },
    })
    if (buildings.length !== ELIGIBLE_BUILDING_CODES.length) {
      return NextResponse.json({ error: 'ไม่พบอาคาร CT/YW/NANA ครบทั้ง 3 อาคาร' }, { status: 500 })
    }

    // 5) คำนวณ per-holiday: amountPerHoliday = salary_of_holiday_month / 30 * 2
    const empDisplayName = employee.nickname || `${employee.firstName} ${employee.lastName}`.trim()
    let totalAllBuildings = 0
    const perHolidayDetails: { name: string; date: string; salary: number; amount: number }[] = []

    for (const h of holidays) {
      const hm = h.date.getUTCMonth() + 1
      const hy = h.date.getUTCFullYear()
      const sal = lookupSalary(hm, hy)
      if (sal <= 0) {
        return NextResponse.json(
          { error: `พนักงาน "${empDisplayName}" ไม่มีเงินเดือนในช่วงก่อนหรือตรงกับวันหยุด ${h.date.toISOString().slice(0, 10)} ที่เลือก` },
          { status: 400 }
        )
      }
      const amt = (sal / 30) * 2
      totalAllBuildings += amt
      const dd = h.date.getUTCDate()
      const mmStr = String(hm).padStart(2, '0')
      perHolidayDetails.push({
        name: h.name,
        date: `${dd}/${mmStr}/${hy}`,
        salary: sal,
        amount: amt,
      })
    }

    const perBuilding = totalAllBuildings / buildings.length
    const days = holidays.length

    // 6) สร้าง description (snapshot ของรายละเอียดทุกวันหยุด)
    // เรียงสรุป: "ชื่อ | วันหยุด: 13/04/2026 (ฐาน 16,000 → 1,066.67) + 14/04/2026 (ฐาน 16,000 → 1,066.67) | รวม 2,133.33 ÷ 3 = 711.11"
    const detailParts = perHolidayDetails.map(d =>
      `${d.date} (ฐาน ${d.salary.toLocaleString()} → ${d.amount.toFixed(2)})`
    ).join(' + ')
    const description = `${empDisplayName} | ${days} วัน: ${detailParts} | รวม ${totalAllBuildings.toFixed(2)} ÷ ${buildings.length} = ${perBuilding.toFixed(2)}`

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
