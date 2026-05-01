import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMenuAccess, requireAuth, handleAuthError } from '@/lib/auth'

// GET - ดึงรายการวันหยุดราชการ (filter ตาม year ได้)
// ผู้ใช้ทุก role ที่ login แล้ว ดึงได้ (ใช้ในหน้ากรอกข้อมูลด้วย)
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')

    const where: { date?: { gte: Date; lt: Date } } = {}
    if (yearParam) {
      const year = parseInt(yearParam)
      where.date = {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      }
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(holidays)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching holidays:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลวันหยุด' }, { status: 500 })
  }
}

// POST - เพิ่มวันหยุดใหม่ (Partner only)
export async function POST(request: NextRequest) {
  try {
    await requireMenuAccess('/holidays')

    const body = await request.json()
    const { name, date } = body

    if (!name || !date) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและวันที่' }, { status: 400 })
    }

    const holiday = await prisma.holiday.create({
      data: {
        name: String(name).trim(),
        date: new Date(date),
        isActive: true,
      },
    })

    return NextResponse.json(holiday)
  } catch (error: unknown) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'มีวันหยุดในวันนี้อยู่แล้ว' }, { status: 400 })
    }
    console.error('Error creating holiday:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเพิ่มวันหยุด' }, { status: 500 })
  }
}
