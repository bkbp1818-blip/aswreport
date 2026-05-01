import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'

// DELETE - ลบรายการค่าแรงวันหยุดชดเชยทั้ง group (3 อาคาร CT/YW/NANA)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await requireMenuAccess('/transactions')

    const { groupId } = await params
    if (!groupId) {
      return NextResponse.json({ error: 'กรุณาระบุ groupId' }, { status: 400 })
    }

    const result = await prisma.expenseHistory.deleteMany({
      where: { groupId },
    })

    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error deleting holiday compensation group:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบ' }, { status: 500 })
  }
}
