import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePartner, handleAuthError } from '@/lib/auth'

// GET - ดึงรายการ OTA Sources ทั้งหมด (เฉพาะ active)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const otaSources = await prisma.otaSource.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(otaSources)
  } catch (error) {
    console.error('Error fetching OTA sources:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงรายการ OTA' },
      { status: 500 }
    )
  }
}

// POST - เพิ่ม OTA Source ใหม่ (Partner เท่านั้น)
export async function POST(request: NextRequest) {
  try {
    await requirePartner()

    const body = await request.json()
    const { name, order } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อ OTA' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    const existing = await prisma.otaSource.findUnique({
      where: { name: trimmedName },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'มี OTA ชื่อนี้อยู่แล้ว' },
        { status: 409 }
      )
    }

    const maxOrder = await prisma.otaSource.findFirst({
      orderBy: { order: 'desc' },
    })

    const otaSource = await prisma.otaSource.create({
      data: {
        name: trimmedName,
        order: typeof order === 'number' ? order : (maxOrder?.order || 0) + 1,
        isActive: true,
      },
    })

    return NextResponse.json(otaSource, { status: 201 })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error creating OTA source:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้าง OTA' },
      { status: 500 }
    )
  }
}
