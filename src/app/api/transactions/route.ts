import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - ดึงรายการ transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const where: {
      buildingId?: number
      month?: number
      year?: number
    } = {}

    if (buildingId) where.buildingId = parseInt(buildingId)
    if (month) where.month = parseInt(month)
    if (year) where.year = parseInt(year)

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        building: true,
      },
      orderBy: [
        { category: { type: 'asc' } },
        { category: { order: 'asc' } },
      ],
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    )
  }
}

// POST - สร้างหรืออัปเดต transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { buildingId, categoryId, amount, month, year, note } = body

    if (!buildingId || !categoryId || !month || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    // upsert - สร้างใหม่หรืออัปเดตถ้ามีอยู่แล้ว
    const transaction = await prisma.transaction.upsert({
      where: {
        buildingId_categoryId_month_year: {
          buildingId: parseInt(buildingId),
          categoryId: parseInt(categoryId),
          month: parseInt(month),
          year: parseInt(year),
        },
      },
      update: {
        amount: parseFloat(amount) || 0,
        note: note || null,
      },
      create: {
        buildingId: parseInt(buildingId),
        categoryId: parseInt(categoryId),
        amount: parseFloat(amount) || 0,
        month: parseInt(month),
        year: parseInt(year),
        note: note || null,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error saving transaction:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    )
  }
}

// PUT - อัปเดตหลายรายการพร้อมกัน (bulk update)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { transactions } = body

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อมูล transactions' },
        { status: 400 }
      )
    }

    // ใช้ transaction เพื่อให้แน่ใจว่าทุกอย่างสำเร็จหรือไม่สำเร็จพร้อมกัน
    const results = await prisma.$transaction(
      transactions.map((t: {
        buildingId: number
        categoryId: number
        amount: number
        month: number
        year: number
        note?: string
      }) =>
        prisma.transaction.upsert({
          where: {
            buildingId_categoryId_month_year: {
              buildingId: t.buildingId,
              categoryId: t.categoryId,
              month: t.month,
              year: t.year,
            },
          },
          update: {
            amount: t.amount || 0,
            note: t.note || null,
          },
          create: {
            buildingId: t.buildingId,
            categoryId: t.categoryId,
            amount: t.amount || 0,
            month: t.month,
            year: t.year,
            note: t.note || null,
          },
        })
      )
    )

    return NextResponse.json({ success: true, count: results.length })
  } catch (error) {
    console.error('Error bulk updating transactions:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    )
  }
}
