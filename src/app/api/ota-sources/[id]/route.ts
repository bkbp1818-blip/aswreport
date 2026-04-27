import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePartner, handleAuthError } from '@/lib/auth'

// PATCH - อัปเดต OTA Source (Partner เท่านั้น)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePartner()

    const { id } = await params
    const body = await request.json()
    const { name, order, isActive } = body

    const updateData: { name?: string; order?: number; isActive?: boolean } = {}
    if (name !== undefined) updateData.name = String(name).trim()
    if (order !== undefined) updateData.order = Number(order)
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    const otaSource = await prisma.otaSource.update({
      where: { id: parseInt(id) },
      data: updateData,
    })

    return NextResponse.json(otaSource)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error updating OTA source:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดต OTA' },
      { status: 500 }
    )
  }
}

// DELETE - ลบแบบ soft delete (ตั้ง isActive=false) (Partner เท่านั้น)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePartner()

    const { id } = await params

    const otaSource = await prisma.otaSource.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, otaSource })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error deleting OTA source:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบ OTA' },
      { status: 500 }
    )
  }
}
