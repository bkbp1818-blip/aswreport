import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - เพิ่ม categories ใหม่
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'paypal-fee') {
      // เพิ่ม PayPal Fee expense
      const name = 'ค่า Fee จาก PayPal'

      const existing = await prisma.category.findFirst({
        where: { name }
      })

      if (existing) {
        return NextResponse.json({
          success: false,
          message: 'Category already exists',
          existing
        })
      }

      const maxOrder = await prisma.category.findFirst({
        where: { type: 'EXPENSE' },
        orderBy: { order: 'desc' },
      })

      const category = await prisma.category.create({
        data: {
          name,
          type: 'EXPENSE',
          order: (maxOrder?.order || 0) + 1,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Created PayPal Fee category',
        created: category
      })
    }

    // Default: เพิ่ม payment channels (income)
    const newCategories = [
      'ค่าเช่าจาก PayPal',
      'ค่าเช่าจาก Credit Card',
      'ค่าเช่าจาก Bank Transfer',
    ]

    const maxOrder = await prisma.category.findFirst({
      where: { type: 'INCOME' },
      orderBy: { order: 'desc' },
    })

    let currentOrder = (maxOrder?.order || 0) + 1
    const created = []

    for (const name of newCategories) {
      const existing = await prisma.category.findFirst({
        where: { name }
      })

      if (!existing) {
        const category = await prisma.category.create({
          data: {
            name,
            type: 'INCOME',
            order: currentOrder,
          },
        })
        created.push(category)
        currentOrder++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${created.length} categories`,
      created
    })
  } catch (error) {
    console.error('Error adding categories:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่' },
      { status: 500 }
    )
  }
}
