import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - อัปเดตหมวดหมู่
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, order } = body

    const updateData: { name?: string; order?: number } = {}
    if (name !== undefined) updateData.name = name
    if (order !== undefined) updateData.order = order

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData,
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัปเดตหมวดหมู่' },
      { status: 500 }
    )
  }
}

// DELETE - ลบหมวดหมู่
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.category.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบหมวดหมู่' },
      { status: 500 }
    )
  }
}
