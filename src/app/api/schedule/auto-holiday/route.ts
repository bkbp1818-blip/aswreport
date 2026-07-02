import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError } from '@/lib/auth'
import { requireScheduleRead, requireScheduleWrite } from '../_auth'
import {
  parseISODateUTC,
  isBeforeMinDate,
  formatDateISO,
  SCHEDULE_MIN_DATE_ISO,
} from '../_utils'

// GET - preview วันหยุดในช่วง (อ่านอย่างเดียว) เพื่อให้ผู้ใช้ยืนยันก่อนใส่
// ?from(YYYY-MM-DD) & ?to(YYYY-MM-DD)
export async function GET(request: NextRequest) {
  try {
    await requireScheduleRead()

    const from = parseISODateUTC(request.nextUrl.searchParams.get('from'))
    const to = parseISODateUTC(request.nextUrl.searchParams.get('to'))
    if (!from || !to) {
      return NextResponse.json({ error: 'กรุณาระบุ from และ to (YYYY-MM-DD)' }, { status: 400 })
    }

    // 👁️ อ่าน Holiday อย่างเดียว
    const holidays = await prisma.holiday.findMany({
      where: { isActive: true, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({
      holidays: holidays
        .filter((h) => !isBeforeMinDate(h.date))
        .map((h) => ({ date: formatDateISO(h.date), name: h.name })),
    })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error previewing holidays:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงวันหยุด' }, { status: 500 })
  }
}

// POST - "ใส่วันหยุดอัตโนมัติ"
// อ่านวันหยุดจากตาราง Holiday (อ่านอย่างเดียว) แล้วสร้าง ScheduleEntry (isDayOff=true)
// ให้พนักงานตามช่วงวันที่ที่เลือก — ห้ามแตะตาราง Holiday
// body: { from(YYYY-MM-DD), to(YYYY-MM-DD), employeeIds?: number[] }
export async function POST(request: NextRequest) {
  try {
    await requireScheduleWrite()

    const body = await request.json()
    const from = parseISODateUTC(body.from)
    const to = parseISODateUTC(body.to)

    if (!from || !to) {
      return NextResponse.json(
        { error: 'กรุณาระบุ from และ to (รูปแบบ YYYY-MM-DD)' },
        { status: 400 }
      )
    }
    if (to.getTime() < from.getTime()) {
      return NextResponse.json({ error: 'to ต้องไม่น้อยกว่า from' }, { status: 400 })
    }

    // ⛔ ทั้งช่วงต้องอยู่ตั้งแต่วันเริ่มใช้ตารางเป็นต้นไป (ตรวจที่ server)
    if (isBeforeMinDate(from) || isBeforeMinDate(to)) {
      return NextResponse.json(
        { error: `ใส่วันหยุดอัตโนมัติได้เฉพาะช่วงวันที่ตั้งแต่ ${SCHEDULE_MIN_DATE_ISO} เป็นต้นไป` },
        { status: 400 }
      )
    }

    // พนักงานเป้าหมาย: ระบุมา หรือ default = พนักงานที่ยังทำงานอยู่ทั้งหมด
    let targetEmployeeIds: number[]
    if (Array.isArray(body.employeeIds) && body.employeeIds.length > 0) {
      targetEmployeeIds = body.employeeIds.map((x: unknown) => parseInt(String(x))).filter((n: number) => !isNaN(n))
    } else {
      const active = await prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      targetEmployeeIds = active.map((e) => e.id)
    }

    if (targetEmployeeIds.length === 0) {
      return NextResponse.json({ error: 'ไม่มีพนักงานเป้าหมาย' }, { status: 400 })
    }

    // 👁️ อ่านวันหยุดจากตาราง Holiday อย่างเดียว (findMany) — ไม่มีการเขียนใดๆ
    const holidays = await prisma.holiday.findMany({
      where: {
        isActive: true,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    })

    if (holidays.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'ไม่มีวันหยุดในช่วงที่เลือก',
        holidaysFound: 0,
        entriesUpserted: 0,
      })
    }

    // สร้าง/อัปเดต ScheduleEntry เป็นวันหยุด (isDayOff=true) ให้พนักงานทุกคนในทุกวันหยุด
    let entriesUpserted = 0
    for (const holiday of holidays) {
      // holiday.date เป็น @db.Date (UTC midnight) — กันซ้ำอีกชั้น
      if (isBeforeMinDate(holiday.date)) continue
      for (const employeeId of targetEmployeeIds) {
        await prisma.scheduleEntry.upsert({
          where: { employeeId_date: { employeeId, date: holiday.date } },
          create: {
            employeeId,
            date: holiday.date,
            startTime: null,
            endTime: null,
            isDayOff: true,
            note: holiday.name,
          },
          update: {
            startTime: null,
            endTime: null,
            isDayOff: true,
            note: holiday.name,
          },
        })
        entriesUpserted++
      }
    }

    return NextResponse.json({
      success: true,
      holidaysFound: holidays.length,
      holidays: holidays.map((h) => ({ date: formatDateISO(h.date), name: h.name })),
      employeesAffected: targetEmployeeIds.length,
      entriesUpserted,
    })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error applying auto-holiday:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการใส่วันหยุดอัตโนมัติ' }, { status: 500 })
  }
}
