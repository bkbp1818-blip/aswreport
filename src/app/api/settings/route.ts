import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePartner, handleAuthError } from '@/lib/auth'

// GET - ดึงการตั้งค่า
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')

    if (buildingId) {
      const settings = await prisma.settings.findUnique({
        where: { buildingId: parseInt(buildingId) },
        include: { building: true },
      })
      return NextResponse.json(settings)
    }

    const allSettings = await prisma.settings.findMany({
      include: { building: true },
      orderBy: { buildingId: 'asc' },
    })
    return NextResponse.json(allSettings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า' },
      { status: 500 }
    )
  }
}

// PUT - อัปเดตการตั้งค่า (ต้องเป็น Partner)
export async function PUT(request: NextRequest) {
  try {
    await requirePartner()

    const body = await request.json()
    const {
      buildingId,
      managementFeePercent,
      vatPercent,
      monthlyRent,
      littleHotelierExpense,
      cowayWaterFilterExpense,
    } = body

    if (!buildingId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ buildingId' },
        { status: 400 }
      )
    }

    const settings = await prisma.settings.upsert({
      where: { buildingId: parseInt(buildingId) },
      update: {
        managementFeePercent: parseFloat(managementFeePercent) || 13.5,
        vatPercent: parseFloat(vatPercent) || 7,
        monthlyRent: parseFloat(monthlyRent) || 0,
        littleHotelierExpense: parseFloat(littleHotelierExpense) || 0,
        cowayWaterFilterExpense: parseFloat(cowayWaterFilterExpense) || 0,
      },
      create: {
        buildingId: parseInt(buildingId),
        managementFeePercent: parseFloat(managementFeePercent) || 13.5,
        vatPercent: parseFloat(vatPercent) || 7,
        monthlyRent: parseFloat(monthlyRent) || 0,
        littleHotelierExpense: parseFloat(littleHotelierExpense) || 0,
        cowayWaterFilterExpense: parseFloat(cowayWaterFilterExpense) || 0,
      },
      include: { building: true },
    })

    return NextResponse.json(settings)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' },
      { status: 500 }
    )
  }
}
