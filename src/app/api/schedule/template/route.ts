import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAuthError } from '@/lib/auth'
import { requireScheduleRead, requireScheduleWrite } from '../_auth'
import { normalizeTime } from '../_utils'

// GET - ดึงแม่แบบกะประจำ (ทั้งหมด หรือกรองด้วย ?employeeId)
export async function GET(request: NextRequest) {
  try {
    await requireScheduleRead()

    const employeeId = request.nextUrl.searchParams.get('employeeId')
    const where = employeeId ? { employeeId: parseInt(employeeId) } : {}

    const templates = await prisma.scheduleTemplate.findMany({
      where,
      orderBy: [{ employeeId: 'asc' }, { weekday: 'asc' }],
    })

    return NextResponse.json(templates)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching schedule templates:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงแม่แบบกะ' }, { status: 500 })
  }
}

// POST - บันทึก/อัปเดตแม่แบบกะของพนักงาน 1 คน
// body: { employeeId, rows: [{ weekday(0-6), startTime, endTime, isDayOff }] }
export async function POST(request: NextRequest) {
  try {
    await requireScheduleWrite()

    const body = await request.json()
    const employeeId = parseInt(String(body.employeeId))
    const rows = Array.isArray(body.rows) ? body.rows : []

    if (!employeeId || rows.length === 0) {
      return NextResponse.json({ error: 'กรุณาระบุ employeeId และ rows' }, { status: 400 })
    }

    // ตรวจว่าพนักงานมีอยู่จริง
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!emp) {
      return NextResponse.json({ error: 'ไม่พบพนักงาน' }, { status: 404 })
    }

    let savedCount = 0
    for (const row of rows) {
      const weekday = parseInt(String(row.weekday))
      if (isNaN(weekday) || weekday < 0 || weekday > 6) {
        return NextResponse.json({ error: `weekday ไม่ถูกต้อง: ${row.weekday}` }, { status: 400 })
      }
      const isDayOff = Boolean(row.isDayOff)
      // วันหยุด → เวลาเป็น null; วันทำงาน → normalize 'HH:mm'
      const startTime = isDayOff ? null : normalizeTime(row.startTime)
      const endTime = isDayOff ? null : normalizeTime(row.endTime)

      await prisma.scheduleTemplate.upsert({
        where: { employeeId_weekday: { employeeId, weekday } },
        create: { employeeId, weekday, startTime, endTime, isDayOff },
        update: { startTime, endTime, isDayOff },
      })
      savedCount++
    }

    return NextResponse.json({ success: true, savedCount })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error saving schedule template:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกแม่แบบกะ' }, { status: 500 })
  }
}

// DELETE - ลบแม่แบบกะ (?employeeId จำเป็น, ?weekday ถ้าไม่ระบุ = ลบทั้ง 7 วันของคนนั้น)
export async function DELETE(request: NextRequest) {
  try {
    await requireScheduleWrite()

    const { searchParams } = request.nextUrl
    const employeeId = searchParams.get('employeeId')
    const weekday = searchParams.get('weekday')

    if (!employeeId) {
      return NextResponse.json({ error: 'กรุณาระบุ employeeId' }, { status: 400 })
    }

    if (weekday !== null) {
      await prisma.scheduleTemplate.deleteMany({
        where: { employeeId: parseInt(employeeId), weekday: parseInt(weekday) },
      })
    } else {
      await prisma.scheduleTemplate.deleteMany({
        where: { employeeId: parseInt(employeeId) },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error deleting schedule template:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบแม่แบบกะ' }, { status: 500 })
  }
}
