import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError } from '@/lib/auth'
import { requireScheduleRead, requireScheduleWrite } from '../_auth'
import {
  parseISODateUTC,
  isBeforeMinDate,
  normalizeTime,
  SCHEDULE_MIN_DATE_ISO,
} from '../_utils'

// GET - ดึงกะรายวัน (override) กรองด้วย ?employeeId, ?from, ?to (YYYY-MM-DD)
export async function GET(request: NextRequest) {
  try {
    await requireScheduleRead()

    const { searchParams } = request.nextUrl
    const employeeId = searchParams.get('employeeId')
    const from = parseISODateUTC(searchParams.get('from'))
    const to = parseISODateUTC(searchParams.get('to'))

    const where: {
      employeeId?: number
      date?: { gte?: Date; lte?: Date }
    } = {}
    if (employeeId) where.employeeId = parseInt(employeeId)
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = from
      if (to) where.date.lte = to
    }

    const entries = await prisma.scheduleEntry.findMany({
      where,
      orderBy: [{ date: 'asc' }, { employeeId: 'asc' }],
    })

    return NextResponse.json(entries)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching schedule entries:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงกะรายวัน' }, { status: 500 })
  }
}

// POST - บันทึก/อัปเดตกะรายวัน 1 วัน (upsert ตาม employeeId + date)
// body: { employeeId, date(YYYY-MM-DD), startTime, endTime, isDayOff, note }
export async function POST(request: NextRequest) {
  try {
    await requireScheduleWrite()

    const body = await request.json()
    const employeeId = parseInt(String(body.employeeId))
    const date = parseISODateUTC(body.date)

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'กรุณาระบุ employeeId และ date (รูปแบบ YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // ⛔ กันเขียนข้อมูลก่อนวันเริ่มใช้ตาราง (ตรวจที่ server)
    if (isBeforeMinDate(date)) {
      return NextResponse.json(
        { error: `แก้ไขได้เฉพาะวันที่ตั้งแต่ ${SCHEDULE_MIN_DATE_ISO} เป็นต้นไป` },
        { status: 400 }
      )
    }

    const emp = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!emp) {
      return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })
    }

    const isDayOff = Boolean(body.isDayOff)
    const startTime = isDayOff ? null : normalizeTime(body.startTime)
    const endTime = isDayOff ? null : normalizeTime(body.endTime)
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null

    const entry = await prisma.scheduleEntry.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { employeeId, date, startTime, endTime, isDayOff, note },
      update: { startTime, endTime, isDayOff, note },
    })

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error saving schedule entry:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกกะรายวัน' }, { status: 500 })
  }
}

// DELETE - ลบกะรายวัน (?employeeId & ?date) → กลับไปใช้ค่าจากแม่แบบ
export async function DELETE(request: NextRequest) {
  try {
    await requireScheduleWrite()

    const { searchParams } = request.nextUrl
    const employeeId = searchParams.get('employeeId')
    const date = parseISODateUTC(searchParams.get('date'))

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'กรุณาระบุ employeeId และ date (รูปแบบ YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // ⛔ กันแก้ไขข้อมูลก่อนวันเริ่มใช้ตาราง
    if (isBeforeMinDate(date)) {
      return NextResponse.json(
        { error: `แก้ไขได้เฉพาะวันที่ตั้งแต่ ${SCHEDULE_MIN_DATE_ISO} เป็นต้นไป` },
        { status: 400 }
      )
    }

    await prisma.scheduleEntry.deleteMany({
      where: { employeeId: parseInt(employeeId), date },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error deleting schedule entry:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบกะรายวัน' }, { status: 500 })
  }
}
