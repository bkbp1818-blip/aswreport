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

// ฟิลด์ที่หาร 3 อาคาร (NANA, CT, YW) - ไม่รวม Funn D
const threeWaySplitFields = ['maxCareExpense', 'trafficCareExpense', 'shippingExpense']

// GET - ดึงยอดรวมของทุก field สำหรับ GLOBAL_SETTINGS
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!month || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุ month และ year' },
        { status: 400 }
      )
    }

    // ดึงจำนวนอาคารทั้งหมด
    const buildingCount = await prisma.building.count()
    const careExpenseDivisor = 3

    // ดึงประวัติทั้งหมดของ GLOBAL_SETTINGS ในเดือน/ปีที่เลือก
    const history = await prisma.expenseHistory.findMany({
      where: {
        targetType: 'GLOBAL_SETTINGS',
        targetId: null,
        month: parseInt(month),
        year: parseInt(year),
      },
    })

    // คำนวณยอดรวมแยกตาม fieldName
    const totals: Record<string, number> = {}
    const totalsPerBuilding: Record<string, number> = {}

    // Initialize ทุก field เป็น 0
    for (const field of expenseFields) {
      totals[field] = 0
      totalsPerBuilding[`${field}PerBuilding`] = 0
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

    // ไม่ให้ติดลบ และคำนวณค่าต่ออาคาร
    for (const field of expenseFields) {
      totals[field] = Math.max(0, totals[field])

      // ค่าดูแล MAX, ค่าดูแลจราจร, ค่าขนส่งสินค้า หาร 3 อาคาร
      if (threeWaySplitFields.includes(field)) {
        totalsPerBuilding[`${field}PerBuilding`] = careExpenseDivisor > 0 ? totals[field] / careExpenseDivisor : 0
      } else {
        totalsPerBuilding[`${field}PerBuilding`] = buildingCount > 0 ? totals[field] / buildingCount : 0
      }
    }

    // คำนวณผลรวมทั้งหมด
    let totalGlobalExpense = 0
    for (const field of expenseFields) {
      if (threeWaySplitFields.includes(field)) {
        totalGlobalExpense += totals[field] / careExpenseDivisor
      } else {
        totalGlobalExpense += buildingCount > 0 ? totals[field] / buildingCount : 0
      }
    }

    return NextResponse.json({
      totals,
      totalsPerBuilding,
      totalGlobalExpense,
      buildingCount,
      careExpenseDivisor,
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
