import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'

// PUT - แก้ไขห้อง (Partner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMenuAccess('/rooms')

    const { id } = await params
    const body = await request.json()
    const { name, note, order, isActive } = body

    const data: { name?: string; note?: string | null; order?: number; isActive?: boolean } = {}
    if (name !== undefined) data.name = String(name).trim()
    if (note !== undefined) data.note = note ? String(note).trim() : null
    if (order !== undefined) data.order = parseInt(order)
    if (isActive !== undefined) data.isActive = Boolean(isActive)

    const room = await prisma.room.update({
      where: { id: parseInt(id) },
      data,
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
    console.error('Error updating room:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการแก้ไขห้อง' }, { status: 500 })
  }
}

// DELETE - Soft delete (set isActive=false) เพื่อรักษาประวัติของ ExpenseHistory
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireMenuAccess('/rooms')

    const { id } = await params

    await prisma.room.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error deleting room:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบห้อง' }, { status: 500 })
  }
}
