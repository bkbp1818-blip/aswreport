import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'

// PUT - แก้ไขวันหยุด (Partner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMenuAccess('/holidays')

    const { id } = await params
    const body = await request.json()
    const { name, date, isActive } = body

    const data: { name?: string; date?: Date; isActive?: boolean } = {}
    if (name !== undefined) data.name = String(name).trim()
    if (date !== undefined) data.date = new Date(date)
    if (isActive !== undefined) data.isActive = Boolean(isActive)

    const holiday = await prisma.holiday.update({
      where: { id: parseInt(id) },
      data,
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
    console.error('Error updating holiday:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการแก้ไขวันหยุด' }, { status: 500 })
  }
}

// DELETE - Soft delete (set isActive=false) เพื่อรักษาประวัติเก่า
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMenuAccess('/holidays')

    const { id } = await params

    await prisma.holiday.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error deleting holiday:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบวันหยุด' }, { status: 500 })
  }
}
