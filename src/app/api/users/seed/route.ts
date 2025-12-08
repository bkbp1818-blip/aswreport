import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Seed users ตัวอย่าง
export async function POST() {
  try {
    const users = [
      // หุ้นส่วน
      { username: 'partner1', password: '1234', name: 'หุ้นส่วน 1', role: 'PARTNER' as const },
      { username: 'partner2', password: '1234', name: 'หุ้นส่วน 2', role: 'PARTNER' as const },
      // พนักงาน
      { username: 'staff1', password: '1234', name: 'พนักงาน 1', role: 'STAFF' as const },
      { username: 'staff2', password: '1234', name: 'พนักงาน 2', role: 'STAFF' as const },
    ]

    const results = []

    for (const user of users) {
      const existing = await prisma.user.findUnique({
        where: { username: user.username },
      })

      if (!existing) {
        const created = await prisma.user.create({
          data: user,
        })
        results.push({ ...created, status: 'created' })
      } else {
        results.push({ ...existing, status: 'already exists' })
      }
    }

    return NextResponse.json({
      message: 'Seed completed',
      users: results,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการ seed' },
      { status: 500 }
    )
  }
}
