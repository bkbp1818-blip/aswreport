import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePartner, handleAuthError } from '@/lib/auth'

// GET - ดึงข้อมูลย้อนหลังหลายเดือน (ต้องเป็น Partner)
export async function GET(request: NextRequest) {
  try {
    await requirePartner()

    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')
    const months = parseInt(searchParams.get('months') || '6') // จำนวนเดือนย้อนหลัง (ถ้าไม่ใช่ custom)

    // รองรับ custom range
    const startMonth = searchParams.get('startMonth')
    const startYear = searchParams.get('startYear')
    const endMonth = searchParams.get('endMonth')
    const endYear = searchParams.get('endYear')

    if (!buildingId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ buildingId' },
        { status: 400 }
      )
    }

    const historyData = []

    if (startMonth && startYear && endMonth && endYear) {
      // Custom range mode
      const start = new Date(parseInt(startYear), parseInt(startMonth) - 1, 1)
      const end = new Date(parseInt(endYear), parseInt(endMonth) - 1, 1)

      const current = new Date(start)
      while (current <= end) {
        const month = current.getMonth() + 1
        const year = current.getFullYear()

        const summary = await calculateBuildingSummary(
          parseInt(buildingId),
          month,
          year
        )

        historyData.push({
          ...summary,
          monthLabel: `${getShortMonthName(month)}`,
          monthYear: `${getShortMonthName(month)} ${year}`,
        })

        // เพิ่มเดือน
        current.setMonth(current.getMonth() + 1)
      }
    } else {
      // Default: ย้อนหลังจากเดือนปัจจุบัน
      const now = new Date()
      for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const month = targetDate.getMonth() + 1
        const year = targetDate.getFullYear()

        const summary = await calculateBuildingSummary(
          parseInt(buildingId),
          month,
          year
        )

        historyData.push({
          ...summary,
          monthLabel: `${getShortMonthName(month)}`,
          monthYear: `${getShortMonthName(month)} ${year}`,
        })
      }
    }

    return NextResponse.json(historyData)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching history:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลย้อนหลัง' },
      { status: 500 }
    )
  }
}

function getShortMonthName(month: number): string {
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ]
  return months[month - 1] || ''
}

async function calculateBuildingSummary(
  buildingId: number,
  month: number,
  year: number
) {
  // ดึงข้อมูล building และ settings
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    include: { settings: true },
  })

  if (!building) {
    return {
      buildingId,
      buildingName: 'Unknown',
      buildingCode: '',
      month,
      year,
      totalIncome: 0,
      totalExpense: 0,
      grossProfit: 0,
      netProfit: 0,
    }
  }

  const settings = building.settings

  // ดึง categories ทั้งหมด
  const categories = await prisma.category.findMany()
  const categoryMap = new Map(categories.map(c => [c.id, c]))

  // ดึง expense history ของเดือนนี้ (ใช้เหมือนกับ summary/route.ts)
  const expenseHistory = await prisma.expenseHistory.findMany({
    where: {
      targetType: 'TRANSACTION',
      targetId: buildingId,
      month,
      year,
    },
  })

  // คำนวณยอดรวมจาก expense history แยกตาม categoryId (fieldName)
  const categoryTotals: Record<number, number> = {}
  let airportShuttleRentIncome = 0
  let thaiBusTourIncome = 0
  let coVanKesselIncome = 0
  let cleaningFeeIncome = 0
  for (const item of expenseHistory) {
    // ถ้าเป็น special income fields ให้เก็บแยก
    if (item.fieldName === 'airportShuttleRentIncome') {
      const amount = Number(item.amount)
      if (item.actionType === 'ADD') {
        airportShuttleRentIncome += amount
      } else {
        airportShuttleRentIncome -= amount
      }
      continue
    }
    if (item.fieldName === 'thaiBusTourIncome') {
      const amount = Number(item.amount)
      if (item.actionType === 'ADD') {
        thaiBusTourIncome += amount
      } else {
        thaiBusTourIncome -= amount
      }
      continue
    }
    if (item.fieldName === 'coVanKesselIncome') {
      const amount = Number(item.amount)
      if (item.actionType === 'ADD') {
        coVanKesselIncome += amount
      } else {
        coVanKesselIncome -= amount
      }
      continue
    }
    if (item.fieldName === 'cleaningFeeIncome') {
      const amount = Number(item.amount)
      if (item.actionType === 'ADD') {
        cleaningFeeIncome += amount
      } else {
        cleaningFeeIncome -= amount
      }
      continue
    }
    const categoryId = parseInt(item.fieldName)
    if (!categoryTotals[categoryId]) {
      categoryTotals[categoryId] = 0
    }
    const amount = Number(item.amount)
    if (item.actionType === 'ADD') {
      categoryTotals[categoryId] += amount
    } else {
      categoryTotals[categoryId] -= amount
    }
  }
  // ไม่ให้ติดลบ
  airportShuttleRentIncome = Math.max(0, airportShuttleRentIncome)
  thaiBusTourIncome = Math.max(0, thaiBusTourIncome)
  coVanKesselIncome = Math.max(0, coVanKesselIncome)
  cleaningFeeIncome = Math.max(0, cleaningFeeIncome)
  for (const key of Object.keys(categoryTotals)) {
    categoryTotals[parseInt(key)] = Math.max(0, categoryTotals[parseInt(key)])
  }

  // สร้าง virtual transactions จาก expense history totals
  const transactions: { category: { id: number; name: string; type: string }; amount: number }[] = []
  for (const [categoryIdStr, amount] of Object.entries(categoryTotals)) {
    const categoryId = parseInt(categoryIdStr)
    const category = categoryMap.get(categoryId)
    if (category && amount > 0) {
      transactions.push({
        category: { id: category.id, name: category.name, type: category.type },
        amount,
      })
    }
  }

  // ดึงข้อมูลเงินเดือนพนักงาน (หาร 3 อาคาร: CT, YW, NANA)
  const buildings = await prisma.building.findMany()
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
  })
  const totalSalary = employees.reduce((sum, emp) => sum + Number(emp.salary), 0)
  const salaryDivisor = 3 // หาร 3 อาคาร (CT, YW, NANA)
  const eligibleBuildingsForSalary = ['CT', 'YW', 'NANA']
  const isEligibleForSalary = eligibleBuildingsForSalary.includes(building.code)
  const salaryPerBuilding = isEligibleForSalary
    ? totalSalary / salaryDivisor
    : 0

  // ดึงข้อมูลเงินสมทบประกันสังคม (หาร 3 อาคาร: CT, YW, NANA)
  const socialSecurityContributions = await prisma.socialSecurityContribution.findMany({
    where: { month, year },
  })
  const totalSocialSecurity = socialSecurityContributions.reduce(
    (sum, c) => sum + Number(c.amount),
    0
  )
  const socialSecurityDivisor = 3 // หาร 3 อาคาร (CT, YW, NANA)
  const eligibleBuildingsForSocialSecurity = ['CT', 'YW', 'NANA']
  const isEligibleForSocialSecurity = eligibleBuildingsForSocialSecurity.includes(building.code)
  const socialSecurityPerBuilding = isEligibleForSocialSecurity
    ? totalSocialSecurity / socialSecurityDivisor
    : 0

  // ดึงข้อมูลค่าใช้จ่ายส่วนกลางจาก ExpenseHistory (targetId: null, หาร 3 อาคาร)
  const globalExpenseHistory = await prisma.expenseHistory.findMany({
    where: {
      targetType: 'GLOBAL_SETTINGS',
      targetId: null,
      month,
      year,
    },
  })

  // รายการฟิลด์ค่าใช้จ่ายส่วนกลางทั้งหมด
  const globalExpenseFields = [
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
  ]

  // คำนวณยอดรวมจาก ExpenseHistory (ค่าที่กรอกมาเป็นค่าของอาคารนี้โดยตรง ไม่ต้องหาร)
  const globalExpenseTotals: Record<string, number> = {}
  for (const field of globalExpenseFields) {
    globalExpenseTotals[field] = 0
  }

  for (const item of globalExpenseHistory) {
    const fieldName = item.fieldName
    if (!globalExpenseFields.includes(fieldName)) continue

    const amount = Number(item.amount)
    if (item.actionType === 'ADD') {
      globalExpenseTotals[fieldName] += amount
    } else {
      globalExpenseTotals[fieldName] -= amount
    }
  }

  // ไม่ให้ติดลบ
  for (const field of globalExpenseFields) {
    globalExpenseTotals[field] = Math.max(0, globalExpenseTotals[field])
  }

  // ค่าใช้จ่ายส่วนกลาง (ยอดรวมหาร 3 อาคาร: CT, YW, NANA)
  const eligibleBuildingsForGlobal = ['CT', 'YW', 'NANA']
  const isEligibleForGlobal = eligibleBuildingsForGlobal.includes(building.code)
  const globalDivisor = 3
  const maxCareExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.maxCareExpense / globalDivisor : 0
  const trafficCareExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.trafficCareExpense / globalDivisor : 0
  const shippingExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.shippingExpense / globalDivisor : 0
  const amenityExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.amenityExpense / globalDivisor : 0
  const waterBottleExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.waterBottleExpense / globalDivisor : 0
  const cookieExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.cookieExpense / globalDivisor : 0
  const coffeeExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.coffeeExpense / globalDivisor : 0
  const fuelExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.fuelExpense / globalDivisor : 0
  const parkingExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.parkingExpense / globalDivisor : 0
  const motorcycleMaintenanceExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.motorcycleMaintenanceExpense / globalDivisor : 0
  const maidTravelExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.maidTravelExpense / globalDivisor : 0
  const cleaningSupplyExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.cleaningSupplyExpense / globalDivisor : 0
  const foodExpensePerBuilding = isEligibleForGlobal ? globalExpenseTotals.foodExpense / globalDivisor : 0

  // ดึงค่าเช่าเครื่องกรองน้ำ Coway จาก ExpenseHistory (แยกแต่ละอาคาร)
  const cowayHistory = await prisma.expenseHistory.findMany({
    where: { targetType: 'SETTINGS', targetId: buildingId, fieldName: 'cowayWaterFilterExpense', month, year },
  })
  let cowayWaterFilterExpense = 0
  for (const item of cowayHistory) {
    const amount = Number(item.amount)
    cowayWaterFilterExpense += item.actionType === 'ADD' ? amount : -amount
  }
  cowayWaterFilterExpense = Math.max(0, cowayWaterFilterExpense)

  // รวมค่าใช้จ่ายส่วนกลางทั้งหมด
  const totalGlobalExpensePerBuilding = maxCareExpensePerBuilding + trafficCareExpensePerBuilding +
    shippingExpensePerBuilding + amenityExpensePerBuilding + waterBottleExpensePerBuilding +
    cookieExpensePerBuilding + coffeeExpensePerBuilding + fuelExpensePerBuilding + parkingExpensePerBuilding +
    motorcycleMaintenanceExpensePerBuilding + maidTravelExpensePerBuilding +
    cleaningSupplyExpensePerBuilding + foodExpensePerBuilding

  // คำนวณรายรับ
  const incomeTransactions = transactions.filter(
    (t) => t.category.type === 'INCOME'
  )
  // รวมรายได้จาก categories + special income fields
  const totalIncome = incomeTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  ) + airportShuttleRentIncome + thaiBusTourIncome + coVanKesselIncome + cleaningFeeIncome

  // คำนวณรายจ่าย (ไม่รวมเงินเดือนพนักงานที่กรอกมา เพราะจะใช้ค่าจาก employees แทน)
  const expenseTransactions = transactions.filter(
    (t) => t.category.type === 'EXPENSE'
  )
  const transactionExpenseExcludeSalary = expenseTransactions
    .filter((t) => t.category.name !== 'เงินเดือนพนักงาน')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  // ดึงค่าเช่าอาคารจาก settings เพื่อรวมในรายจ่าย
  const monthlyRentFromSettings = settings ? Number(settings.monthlyRent) : 0
  // รวมค่าใช้จ่าย = transactions (ไม่รวมเงินเดือน) + ค่าเช่าอาคาร + ค่าเช่าเครื่องกรองน้ำ Coway + เงินเดือนพนักงาน + ค่าใช้จ่ายส่วนกลางทั้งหมด + เงินสมทบประกันสังคม
  const totalExpense = transactionExpenseExcludeSalary + monthlyRentFromSettings + cowayWaterFilterExpense + salaryPerBuilding + totalGlobalExpensePerBuilding + socialSecurityPerBuilding

  // แยกรายรับตามช่องทาง
  const incomeByChannel: Record<string, number> = {}
  incomeTransactions.forEach((t) => {
    incomeByChannel[t.category.name] = Number(t.amount)
  })
  // เพิ่ม special income fields
  if (airportShuttleRentIncome > 0) {
    incomeByChannel['ค่าเช่า รถรับส่งสนามบิน'] = airportShuttleRentIncome
  }
  if (thaiBusTourIncome > 0) {
    incomeByChannel['Thai Bus Tour'] = thaiBusTourIncome
  }
  if (coVanKesselIncome > 0) {
    incomeByChannel['Co Van Kessel'] = coVanKesselIncome
  }
  if (cleaningFeeIncome > 0) {
    incomeByChannel['ค่าทำความสะอาด'] = cleaningFeeIncome
  }

  // แยกรายจ่ายตามหมวดหมู่
  const expenseByCategory: Record<string, number> = {}
  expenseTransactions.forEach((t) => {
    expenseByCategory[t.category.name] = Number(t.amount)
  })

  // เพิ่มค่าเช่าอาคารเข้าไปในรายจ่าย (ถ้ามี)
  if (monthlyRentFromSettings > 0) {
    expenseByCategory['ค่าเช่าอาคาร'] = monthlyRentFromSettings
  }

  // เพิ่มค่าเช่าเครื่องกรองน้ำ Coway เข้าไปในรายจ่าย
  expenseByCategory['ค่าเช่าเครื่องกรองน้ำ Coway'] = cowayWaterFilterExpense

  // เพิ่มเงินเดือนพนักงานเข้าไปในรายจ่าย (ถ้ามี)
  if (salaryPerBuilding > 0) {
    expenseByCategory['เงินเดือนพนักงาน'] = salaryPerBuilding
  }

  // เพิ่มค่าใช้จ่ายส่วนกลางทั้งหมดเข้าไปในรายจ่าย
  if (maxCareExpensePerBuilding > 0) {
    expenseByCategory['ค่าดูแล MAX'] = maxCareExpensePerBuilding
  }
  if (trafficCareExpensePerBuilding > 0) {
    expenseByCategory['ค่าดูแลจราจร'] = trafficCareExpensePerBuilding
  }
  if (shippingExpensePerBuilding > 0) {
    expenseByCategory['ค่าขนส่งสินค้า'] = shippingExpensePerBuilding
  }
  expenseByCategory['ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)'] = amenityExpensePerBuilding
  expenseByCategory['ค่าน้ำเปล่า'] = waterBottleExpensePerBuilding
  expenseByCategory['ค่าขนมคุ้กกี้'] = cookieExpensePerBuilding
  expenseByCategory['ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท'] = coffeeExpensePerBuilding
  expenseByCategory['ค่าน้ำมันรถมอเตอร์ไซค์'] = fuelExpensePerBuilding
  expenseByCategory['ค่าเช่าที่จอดรถมอเตอร์ไซค์'] = parkingExpensePerBuilding
  expenseByCategory['ค่าซ่อมบำรุงรถมอเตอร์ไซค์'] = motorcycleMaintenanceExpensePerBuilding
  expenseByCategory['ค่าเดินทางแม่บ้าน'] = maidTravelExpensePerBuilding
  expenseByCategory['ค่าอุปกรณ์ทำความสะอาด'] = cleaningSupplyExpensePerBuilding
  expenseByCategory['ค่าอาหาร'] = foodExpensePerBuilding
  // เพิ่มเงินสมทบประกันสังคม (หาร 3 อาคาร: CT, YW, NANA)
  expenseByCategory['เงินสมทบประกันสังคม'] = socialSecurityPerBuilding

  // คำนวณตามสูตร
  const grossProfit = totalIncome - totalExpense
  const vatPercent = settings ? Number(settings.vatPercent) : 7
  const monthlyRent = settings ? Number(settings.monthlyRent) : 0
  const littleHotelierExpense = settings
    ? Number(settings.littleHotelierExpense)
    : 0

  // Management Fee ถูกลบออกแล้ว — ตั้งเป็น 0
  const managementFee = 0
  // VAT คำนวณจาก Management Fee ซึ่งเป็น 0 — จึงเป็น 0
  const vat = 0
  // Net Profit = Gross Profit - Little Hotelier
  const netProfit = grossProfit - littleHotelierExpense
  // Amount to be paid = 0 (ไม่มี Management Fee แล้ว)
  const amountToBePaid = 0

  return {
    buildingId,
    buildingName: building.name,
    buildingCode: building.code,
    month,
    year,
    totalIncome,
    totalExpense,
    grossProfit,
    vatPercent,
    vat,
    littleHotelierExpense,
    monthlyRent,
    netProfit,
    amountToBePaid,
    incomeByChannel,
    expenseByCategory,
  }
}
