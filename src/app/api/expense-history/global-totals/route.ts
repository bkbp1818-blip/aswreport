import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// รายการฟิลด์ค่าใช้จ่ายส่วนกลางทั้งหมด
const expenseFields = [
  'maxCareExpense',
  'trafficCareExpense',
  'shippingExpense',
  'amenityExpense',
  'waterBottleExpense',
  'cookieExpense',
  'coffeeExpense',
  'sugarExpense',
  'coffeeMateExpense',
  'fuelExpense',
  'parkingExpense',
  'motorcycleMaintenanceExpense',
  'maidTravelExpense',
  'cleaningSupplyExpense',
  'foodExpense',
] as const

// GET - ดึงยอดรวมของทุก field สำหรับ GLOBAL_SETTINGS (แยกแต่ละอาคาร)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const buildingId = searchParams.get('buildingId')

    if (!month || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุ month และ year' },
        { status: 400 }
      )
    }

    // ดึงจำนวนอาคารทั้งหมด
    const buildingCount = await prisma.building.count()

    // ดึงประวัติของ GLOBAL_SETTINGS ในเดือน/ปีที่เลือก (แยกตาม buildingId)
    const history = await prisma.expenseHistory.findMany({
      where: {
        targetType: 'GLOBAL_SETTINGS',
        targetId: buildingId ? parseInt(buildingId) : null,
        month: parseInt(month),
        year: parseInt(year),
      },
    })

    // คำนวณยอดรวมแยกตาม fieldName
    const totals: Record<string, number> = {}

    // Initialize ทุก field เป็น 0
    for (const field of expenseFields) {
      totals[field] = 0
    }

    // คำนวณจาก history
    for (const item of history) {
      const fieldName = item.fieldName
      if (!expenseFields.includes(fieldName as typeof expenseFields[number])) continue

      const amount = Number(item.amount)
      if (item.actionType === 'ADD') {
        totals[fieldName] += amount
      } else {
        totals[fieldName] -= amount
      }
    }

    // ไม่ให้ติดลบ
    for (const field of expenseFields) {
      totals[field] = Math.max(0, totals[field])
    }

    // คำนวณผลรวมทั้งหมด (ไม่ต้องหาร - กรอกค่าแต่ละอาคารโดยตรง)
    let totalGlobalExpense = 0
    for (const field of expenseFields) {
      totalGlobalExpense += totals[field]
    }

    return NextResponse.json({
      totals,
      totalGlobalExpense,
      buildingCount,
      buildingId: buildingId ? parseInt(buildingId) : null,
      month: parseInt(month),
      year: parseInt(year),
    })
  } catch (error) {
    console.error('Error fetching global expense history totals:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    )
  }
}
