import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'

// GET - ดึงรายการห้อง (filter ตาม buildingId / includeInactive ได้)
// public — staff/viewer ใช้ใน dropdown ของหน้ากรอกข้อมูลด้วย
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buildingIdParam = searchParams.get('buildingId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: { buildingId?: number; isActive?: boolean } = {}
    if (buildingIdParam) where.buildingId = parseInt(buildingIdParam)
    if (!includeInactive) where.isActive = true

    const rooms = await prisma.room.findMany({
      where,
      orderBy: [{ buildingId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(rooms)
  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้อง' }, { status: 500 })
  }
}

// POST - เพิ่มห้องใหม่ (Partner only)
export async function POST(request: NextRequest) {
  try {
    await requireMenuAccess('/rooms')

    const body = await request.json()
    const { buildingId, name, note, order } = body

    if (!buildingId || !name) {
      return NextResponse.json({ error: 'กรุณาเลือกอาคารและกรอกชื่อห้อง' }, { status: 400 })
    }

    const building = await prisma.building.findUnique({
      where: { id: parseInt(buildingId) },
    })
    if (!building) {
      return NextResponse.json({ error: 'ไม่พบอาคารที่ระบุ' }, { status: 400 })
    }

    const room = await prisma.room.create({
      data: {
        buildingId: parseInt(buildingId),
        name: String(name).trim(),
        note: note ? String(note).trim() : null,
        order: order != null ? parseInt(order) : 0,
        isActive: true,
      },
    })

    return NextResponse.json(room)
  } catch (error: unknown) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'มีห้องชื่อนี้ในอาคารนี้อยู่แล้ว' }, { status: 400 })
    }
    console.error('Error creating room:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเพิ่มห้อง' }, { status: 500 })
  }
}
