import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - ดึงรายการอาคารทั้งหมด
export async function GET() {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        Settings: true,
      },
      orderBy: {
        id: 'asc',
      },
    })
    return NextResponse.json(buildings)
  } catch (error) {
    console.error('Error fetching buildings:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลอาคาร' },
      { status: 500 }
    )
  }
}
