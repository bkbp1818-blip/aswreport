import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - ดึงยอดรวมของทุก category สำหรับ TRANSACTION
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const targetType = searchParams.get('targetType')
    const targetId = searchParams.get('targetId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!targetType || !targetId || !month || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุ targetType, targetId, month และ year' },
        { status: 400 }
      )
    }

    // ดึงประวัติทั้งหมดของ target ในเดือน/ปีที่เลือก
    const history = await prisma.expenseHistory.findMany({
      where: {
        targetType,
        targetId: parseInt(targetId),
        month: parseInt(month),
        year: parseInt(year),
      },
    })

    // คำนวณยอดรวมแยกตาม fieldName (categoryId)
    const totals: Record<string, number> = {}

    for (const item of history) {
      const fieldName = item.fieldName
      if (!totals[fieldName]) {
        totals[fieldName] = 0
      }

      const amount = Number(item.amount)
      if (item.actionType === 'ADD') {
        totals[fieldName] += amount
      } else {
        totals[fieldName] -= amount
      }
    }

    // ไม่ให้ติดลบ
    for (const key of Object.keys(totals)) {
      totals[key] = Math.max(0, totals[key])
    }

    return NextResponse.json({
      totals,
      month: parseInt(month),
      year: parseInt(year),
    })
  } catch (error) {
    console.error('Error fetching expense history totals:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    )
  }
}
