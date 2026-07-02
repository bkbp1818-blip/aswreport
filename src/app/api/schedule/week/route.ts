import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError } from '@/lib/auth'
import { requireScheduleRead } from '../_auth'
import {
  parseISODateUTC,
  startOfWeekMonday,
  addDaysUTC,
  dateToWeekday,
  formatDateISO,
  isBeforeMinDate,
  computeShiftHours,
} from '../_utils'

// GET - ดึงตารางเวลาทั้งทีมสำหรับ "สัปดาห์" ที่เลือก
// ?weekStart=YYYY-MM-DD (วันใดก็ได้ในสัปดาห์ ระบบจะ normalize เป็นวันจันทร์)
// รวมแม่แบบ (ScheduleTemplate) + override (ScheduleEntry) + คำนวณ ชม./สัปดาห์ + จำนวนวันหยุด
export async function GET(request: NextRequest) {
  try {
    await requireScheduleRead()

    const weekStartParam = parseISODateUTC(request.nextUrl.searchParams.get('weekStart'))
    if (!weekStartParam) {
      return NextResponse.json(
        { error: 'กรุณาระบุ weekStart (รูปแบบ YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // normalize เป็นวันจันทร์ของสัปดาห์นั้น + สร้าง 7 วัน (จ.–อา.)
    const monday = startOfWeekMonday(weekStartParam)
    const weekDates: Date[] = Array.from({ length: 7 }, (_, i) => addDaysUTC(monday, i))
    const weekEnd = addDaysUTC(monday, 6)

    // metadata ของแต่ละวันในสัปดาห์ (ใช้บอก frontend ว่าวันไหนแก้ไม่ได้)
    const days = weekDates.map((d) => ({
      date: formatDateISO(d),
      weekday: dateToWeekday(d), // 0=จันทร์
      editable: !isBeforeMinDate(d),
    }))
    // ทั้งสัปดาห์อยู่ก่อนวันเริ่มใช้ตารางไหม (วันอาทิตย์ยังก่อน min)
    const isPastWeek = isBeforeMinDate(weekEnd)

    // พนักงานที่ยังทำงานอยู่
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { firstName: 'asc' }],
      // ⚠️ ไม่ดึง nickname — ชื่อเล่นบางคนมีข้อมูลเงินเดือนปน และหน้านี้ทุก role เห็นได้
      select: { id: true, firstName: true, lastName: true, position: true },
    })

    // แม่แบบทั้งหมด + override เฉพาะสัปดาห์นี้ (ดึงทีเดียว ไม่ยิงต่อคน)
    const templates = await prisma.scheduleTemplate.findMany()
    const entries = await prisma.scheduleEntry.findMany({
      where: { date: { gte: monday, lte: weekEnd } },
    })

    // index เพื่อ lookup เร็ว
    const templateMap = new Map<string, (typeof templates)[number]>() // key: employeeId-weekday
    for (const t of templates) templateMap.set(`${t.employeeId}-${t.weekday}`, t)
    const entryMap = new Map<string, (typeof entries)[number]>() // key: employeeId-YYYY-MM-DD
    for (const e of entries) entryMap.set(`${e.employeeId}-${formatDateISO(e.date)}`, e)

    const result = employees.map((emp) => {
      let hoursPerWeek = 0
      let dayOffCount = 0

      const dayCells = weekDates.map((d) => {
        const iso = formatDateISO(d)
        const wd = dateToWeekday(d)
        const entry = entryMap.get(`${emp.id}-${iso}`)
        const template = templateMap.get(`${emp.id}-${wd}`)

        // override (entry) ชนะแม่แบบ (template); ถ้าไม่มีทั้งคู่ = ยังไม่กำหนด
        let source: 'entry' | 'template' | 'none' = 'none'
        let startTime: string | null = null
        let endTime: string | null = null
        let isDayOff = false
        let note: string | null = null

        if (entry) {
          source = 'entry'
          startTime = entry.startTime
          endTime = entry.endTime
          isDayOff = entry.isDayOff
          note = entry.note
        } else if (template) {
          source = 'template'
          startTime = template.startTime
          endTime = template.endTime
          isDayOff = template.isDayOff
        }

        const hours = computeShiftHours(startTime, endTime, isDayOff)
        if (source !== 'none') {
          hoursPerWeek += hours
          if (isDayOff) dayOffCount++
        }

        return {
          date: iso,
          weekday: wd,
          source,
          startTime,
          endTime,
          isDayOff,
          note,
          hours,
          editable: !isBeforeMinDate(d),
        }
      })

      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        position: emp.position,
        days: dayCells,
        hoursPerWeek: Math.round(hoursPerWeek * 100) / 100,
        dayOffCount,
      }
    })

    return NextResponse.json({
      weekStart: formatDateISO(monday),
      weekEnd: formatDateISO(weekEnd),
      isPastWeek,
      days,
      employees: result,
    })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching week schedule:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงตารางเวลารายสัปดาห์' }, { status: 500 })
  }
}
