import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/auth'

// รายการฟิลด์ค่าใช้จ่ายส่วนกลางทั้งหมด
const expenseFields = [
  'maxCareExpense',
  'trafficCareExpense',
  'shippingExpense',
  'amenityExpense',
  'waterBottleExpense',
  'cookieExpense',
  'coffeeExpense',
  'fuelExpense',
  'parkingExpense',
  'motorcycleMaintenanceExpense',
  'maidTravelExpense',
  'cleaningSupplyExpense',
  'foodExpense',
] as const

// ฟิลด์ที่หาร 3 อาคาร (NANA, CT, YW) - ไม่รวม Funn D
const threeWaySplitFields = ['maxCareExpense', 'trafficCareExpense', 'shippingExpense']

// GET - ดึงค่าตั้งค่าส่วนกลาง
export async function GET() {
  try {
    // ดึง GlobalSettings (มีแค่ 1 record)
    let globalSettings = await prisma.globalSettings.findFirst()

    // ถ้ายังไม่มี ให้สร้างค่าเริ่มต้น
    if (!globalSettings) {
      globalSettings = await prisma.globalSettings.create({
        data: {},
      })
    }

    // ดึงจำนวนอาคารทั้งหมด
    const buildingCount = await prisma.building.count()

    // ค่าดูแล MAX และค่าดูแลจราจร หารเฉพาะ 3 อาคาร (NANA, CT, YW) - ไม่รวม Funn D
    const careExpenseDivisor = 3

    // สร้าง response object
    const response: Record<string, number | Date> = {
      id: globalSettings.id,
      buildingCount,
      careExpenseDivisor, // จำนวนอาคารที่ร่วมจ่ายค่าดูแล MAX และจราจร
    }

    // เพิ่มค่าใช้จ่ายแต่ละประเภท และค่าที่หารแล้ว
    for (const field of expenseFields) {
      const value = Number(globalSettings[field]) || 0
      response[field] = value
      // ค่าดูแล MAX, ค่าดูแลจราจร, ค่าขนส่งสินค้า หาร 3 อาคาร, ค่าอื่นๆ หารตามจำนวนอาคารทั้งหมด
      if (threeWaySplitFields.includes(field)) {
        response[`${field}PerBuilding`] = careExpenseDivisor > 0 ? value / careExpenseDivisor : 0
      } else {
        response[`${field}PerBuilding`] = buildingCount > 0 ? value / buildingCount : 0
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching global settings:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตั้งค่า' },
      { status: 500 }
    )
  }
}

// PUT - อัปเดตค่าตั้งค่าส่วนกลาง (ต้อง login)
export async function PUT(request: Request) {
  try {
    // ตรวจสอบสิทธิ์ - ต้อง login (ทั้ง Partner และ Staff)
    await requireAuth()

    const body = await request.json()

    // ดึง GlobalSettings ที่มีอยู่
    let globalSettings = await prisma.globalSettings.findFirst()

    // สร้าง update data
    const updateData: Record<string, number> = {}
    for (const field of expenseFields) {
      if (body[field] !== undefined) {
        updateData[field] = parseFloat(body[field]) || 0
      }
    }

    if (globalSettings) {
      // อัปเดต
      globalSettings = await prisma.globalSettings.update({
        where: { id: globalSettings.id },
        data: updateData,
      })
    } else {
      // สร้างใหม่
      globalSettings = await prisma.globalSettings.create({
        data: updateData,
      })
    }

    // สร้าง response object
    const response: Record<string, number> = {
      id: globalSettings.id,
    }

    for (const field of expenseFields) {
      response[field] = Number(globalSettings[field]) || 0
    }

    return NextResponse.json(response)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error updating global settings:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลตั้งค่า' },
      { status: 500 }
    )
  }
}
