import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/auth'

// DELETE - ลบรายการประวัติ
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ต้อง login
    await requireAuth()

    const { id } = await params
    const historyId = parseInt(id)

    if (isNaN(historyId)) {
      return NextResponse.json(
        { error: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    // ดึงข้อมูลก่อนลบเพื่อใช้ในการคำนวณยอดรวมใหม่
    const historyItem = await prisma.expenseHistory.findUnique({
      where: { id: historyId },
    })

    if (!historyItem) {
      return NextResponse.json(
        { error: 'ไม่พบรายการที่ต้องการลบ' },
        { status: 404 }
      )
    }

    // ลบรายการ
    await prisma.expenseHistory.delete({
      where: { id: historyId },
    })

    // ดึงประวัติที่เหลือเพื่อคำนวณยอดรวมใหม่
    const where: {
      targetType: string
      targetId?: number | null
      fieldName: string
      month: number
      year: number
    } = {
      targetType: historyItem.targetType,
      fieldName: historyItem.fieldName,
      month: historyItem.month,
      year: historyItem.year,
    }

    if (historyItem.targetType === 'SETTINGS' || historyItem.targetType === 'TRANSACTION') {
      where.targetId = historyItem.targetId
    } else {
      where.targetId = null
    }

    const remainingHistory = await prisma.expenseHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // คำนวณยอดรวมใหม่
    let total = 0
    for (const item of remainingHistory) {
      const amount = Number(item.amount)
      if (item.actionType === 'ADD') {
        total += amount
      } else {
        total -= amount
      }
    }

    return NextResponse.json({
      success: true,
      history: remainingHistory,
      total: Math.max(0, total),
    })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error deleting expense history:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบรายการ' },
      { status: 500 }
    )
  }
}
