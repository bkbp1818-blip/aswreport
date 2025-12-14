import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/auth'

// GET - ดึงประวัติการเพิ่ม/ลดค่าใช้จ่าย
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetType = searchParams.get('targetType')
    const targetId = searchParams.get('targetId')
    const fieldName = searchParams.get('fieldName')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!targetType || !fieldName || !month || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุ targetType, fieldName, month และ year' },
        { status: 400 }
      )
    }

    // สร้าง filter
    const where: {
      targetType: string
      targetId?: number | null
      fieldName: string
      month: number
      year: number
    } = {
      targetType,
      fieldName,
      month: parseInt(month),
      year: parseInt(year),
    }

    // ถ้าเป็น SETTINGS หรือ TRANSACTION ต้องระบุ targetId (buildingId)
    if (targetType === 'SETTINGS' || targetType === 'TRANSACTION') {
      if (!targetId) {
        return NextResponse.json(
          { error: 'กรุณาระบุ targetId สำหรับ ' + targetType },
          { status: 400 }
        )
      }
      where.targetId = parseInt(targetId)
    } else {
      where.targetId = null
    }

    // ดึงประวัติ
    const history = await prisma.expenseHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // คำนวณยอดรวมของเดือน
    let total = 0
    for (const item of history) {
      const amount = Number(item.amount)
      if (item.actionType === 'ADD') {
        total += amount
      } else {
        total -= amount
      }
    }

    return NextResponse.json({
      history,
      total: Math.max(0, total), // ไม่ให้ติดลบ
      month: parseInt(month),
      year: parseInt(year),
    })
  } catch (error) {
    console.error('Error fetching expense history:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงประวัติ' },
      { status: 500 }
    )
  }
}

// POST - บันทึกประวัติการเพิ่ม/ลดค่าใช้จ่าย
export async function POST(request: NextRequest) {
  try {
    // ต้อง login
    await requireAuth()

    const body = await request.json()
    const {
      targetType,
      targetId,
      fieldName,
      fieldLabel,
      actionType,
      amount,
      description,
      month,
      year,
    } = body

    // Validate required fields
    if (!targetType || !fieldName || !fieldLabel || !actionType || !amount || !description || !month || !year) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    if (actionType !== 'ADD' && actionType !== 'SUBTRACT') {
      return NextResponse.json(
        { error: 'actionType ต้องเป็น ADD หรือ SUBTRACT' },
        { status: 400 }
      )
    }

    // บันทึกประวัติ
    const expenseHistory = await prisma.expenseHistory.create({
      data: {
        targetType,
        targetId: (targetType === 'SETTINGS' || targetType === 'TRANSACTION') ? parseInt(targetId) : null,
        fieldName,
        fieldLabel,
        actionType,
        amount: parseFloat(amount),
        description,
        month: parseInt(month),
        year: parseInt(year),
      },
    })

    // ดึงประวัติทั้งหมดของเดือนเพื่อคำนวณยอดรวมใหม่
    const where: {
      targetType: string
      targetId?: number | null
      fieldName: string
      month: number
      year: number
    } = {
      targetType,
      fieldName,
      month: parseInt(month),
      year: parseInt(year),
    }

    if (targetType === 'SETTINGS' || targetType === 'TRANSACTION') {
      where.targetId = parseInt(targetId)
    } else {
      where.targetId = null
    }

    const allHistory = await prisma.expenseHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // คำนวณยอดรวม
    let total = 0
    for (const item of allHistory) {
      const itemAmount = Number(item.amount)
      if (item.actionType === 'ADD') {
        total += itemAmount
      } else {
        total -= itemAmount
      }
    }

    return NextResponse.json({
      success: true,
      expenseHistory,
      history: allHistory,
      total: Math.max(0, total),
    })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error creating expense history:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกประวัติ' },
      { status: 500 }
    )
  }
}
