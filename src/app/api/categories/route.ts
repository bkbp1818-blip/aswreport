import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - ดึงรายการหมวดหมู่ทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where = type ? { type: type as 'INCOME' | 'EXPENSE' } : {}

    const categories = await prisma.category.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { order: 'asc' },
      ],
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่' },
      { status: 500 }
    )
  }
}

// POST - สร้างหมวดหมู่ใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อและประเภทหมวดหมู่' },
        { status: 400 }
      )
    }

    // หา order สูงสุด
    const maxOrder = await prisma.category.findFirst({
      where: { type },
      orderBy: { order: 'desc' },
    })

    const category = await prisma.category.create({
      data: {
        name,
        type,
        order: (maxOrder?.order || 0) + 1,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างหมวดหมู่' },
      { status: 500 }
    )
  }
}
