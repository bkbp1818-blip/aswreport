import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/auth'

// GET - ดึงข้อมูลสรุป (ต้อง login)
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!month || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุเดือนและปี' },
        { status: 400 }
      )
    }

    const monthInt = parseInt(month)
    const yearInt = parseInt(year)

    // ถ้าระบุ buildingId ให้คำนวณเฉพาะอาคารนั้น
    if (buildingId) {
      const summary = await calculateBuildingSummary(
        parseInt(buildingId),
        monthInt,
        yearInt
      )
      return NextResponse.json(summary)
    }

    // ถ้าไม่ระบุ ให้คำนวณทุกอาคาร
    const buildings = await prisma.building.findMany()
    const summaries = await Promise.all(
      buildings.map((b) => calculateBuildingSummary(b.id, monthInt, yearInt))
    )

    // รวม incomeByChannel จากทุกอาคาร
    const totalIncomeByChannel: Record<string, number> = {}
    for (const s of summaries) {
      for (const [key, value] of Object.entries(s.incomeByChannel)) {
        if (!totalIncomeByChannel[key]) {
          totalIncomeByChannel[key] = 0
        }
        totalIncomeByChannel[key] += value as number
      }
    }

    // รวม expenseByCategory จากทุกอาคาร
    const totalExpenseByCategory: Record<string, number> = {}
    for (const s of summaries) {
      for (const [key, value] of Object.entries(s.expenseByCategory)) {
        if (!totalExpenseByCategory[key]) {
          totalExpenseByCategory[key] = 0
        }
        totalExpenseByCategory[key] += value as number
      }
    }

    // คำนวณยอดรวมทั้งหมด
    const totalSummary = {
      buildingId: null,
      buildingName: 'รวมทั้งหมด',
      totalIncome: summaries.reduce((sum, s) => sum + s.totalIncome, 0),
      totalExpense: summaries.reduce((sum, s) => sum + s.totalExpense, 0),
      grossProfit: summaries.reduce((sum, s) => sum + s.grossProfit, 0),
      vatPercent: 7, // ค่าเริ่มต้นสำหรับแสดงผลรวม
      vat: summaries.reduce((sum, s) => sum + s.vat, 0),
      littleHotelierExpense: summaries.reduce(
        (sum, s) => sum + s.littleHotelierExpense,
        0
      ),
      monthlyRent: summaries.reduce((sum, s) => sum + s.monthlyRent, 0),
      // ค่าใช้จ่ายส่วนกลางทั้งหมด
      maxCareExpense: summaries.reduce((sum, s) => sum + s.maxCareExpense, 0),
      trafficCareExpense: summaries.reduce((sum, s) => sum + s.trafficCareExpense, 0),
      shippingExpense: summaries.reduce((sum, s) => sum + s.shippingExpense, 0),
      amenityExpense: summaries.reduce((sum, s) => sum + s.amenityExpense, 0),
      waterBottleExpense: summaries.reduce((sum, s) => sum + s.waterBottleExpense, 0),
      cookieExpense: summaries.reduce((sum, s) => sum + s.cookieExpense, 0),
      coffeeExpense: summaries.reduce((sum, s) => sum + s.coffeeExpense, 0),
      fuelExpense: summaries.reduce((sum, s) => sum + s.fuelExpense, 0),
      parkingExpense: summaries.reduce((sum, s) => sum + s.parkingExpense, 0),
      motorcycleMaintenanceExpense: summaries.reduce((sum, s) => sum + s.motorcycleMaintenanceExpense, 0),
      maidTravelExpense: summaries.reduce((sum, s) => sum + s.maidTravelExpense, 0),
      cleaningSupplyExpense: summaries.reduce((sum, s) => sum + s.cleaningSupplyExpense, 0),
      foodExpense: summaries.reduce((sum, s) => sum + s.foodExpense, 0),
      cowayWaterFilterExpense: summaries.reduce((sum, s) => sum + s.cowayWaterFilterExpense, 0),
      socialSecurityExpense: summaries.reduce((sum, s) => sum + s.socialSecurityExpense, 0),
      netProfit: summaries.reduce((sum, s) => sum + s.netProfit, 0),
      amountToBePaid: summaries.reduce((sum, s) => sum + s.amountToBePaid, 0),
      incomeByChannel: totalIncomeByChannel,
      expenseByCategory: totalExpenseByCategory,
    }

    return NextResponse.json({
      buildings: summaries,
      total: totalSummary,
    })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('Error fetching summary:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการคำนวณสรุป' },
      { status: 500 }
    )
  }
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
    throw new Error(`Building ${buildingId} not found`)
  }

  const settings = building.settings

  // ดึง categories ทั้งหมด
  const categories = await prisma.category.findMany()
  const categoryMap = new Map(categories.map(c => [c.id, c]))

  // ดึง expense history ของเดือนนี้ (แทน Transaction table)
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

  // ดึงข้อมูลเงินเดือนพนักงาน (คำนวณจาก employees table)
  const buildings = await prisma.building.findMany()
  const buildingCount = buildings.length
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
  })
  const totalSalary = employees.reduce((sum, emp) => sum + Number(emp.salary), 0)
  const salaryPerBuilding = buildingCount > 0 ? totalSalary / buildingCount : 0

  // ดึงข้อมูลเงินสมทบประกันสังคม (หาร 5 อาคาร)
  const socialSecurityContributions = await prisma.socialSecurityContribution.findMany({
    where: { month, year },
  })
  const totalSocialSecurity = socialSecurityContributions.reduce(
    (sum, c) => sum + Number(c.amount),
    0
  )
  const socialSecurityDivisor = 5 // หาร 5 อาคาร
  const socialSecurityPerBuilding = totalSocialSecurity / socialSecurityDivisor

  // ดึงข้อมูลค่าใช้จ่ายส่วนกลางจาก ExpenseHistory (ตามเดือน/ปี)
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

  // ฟิลด์ที่หาร 3 อาคาร (NANA, CT, YW) - ไม่รวม Funn D
  const threeWaySplitFields = ['maxCareExpense', 'trafficCareExpense', 'shippingExpense']

  // คำนวณยอดรวมจาก ExpenseHistory
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

  // ค่าดูแล MAX และค่าดูแลจราจร หารเฉพาะ 3 อาคาร (NANA, CT, YW) - ไม่รวม Funn D
  const eligibleBuildingsForCare = ['NANA', 'CT', 'YW']
  const isEligibleForCareExpense = eligibleBuildingsForCare.includes(building.code)
  const careExpenseDivisor = 3 // จำนวนอาคารที่ร่วมจ่ายค่าดูแล

  const maxCareExpensePerBuilding = isEligibleForCareExpense
    ? globalExpenseTotals.maxCareExpense / careExpenseDivisor
    : 0
  const trafficCareExpensePerBuilding = isEligibleForCareExpense
    ? globalExpenseTotals.trafficCareExpense / careExpenseDivisor
    : 0
  const shippingExpensePerBuilding = isEligibleForCareExpense
    ? globalExpenseTotals.shippingExpense / careExpenseDivisor
    : 0
  const amenityExpensePerBuilding = buildingCount > 0
    ? globalExpenseTotals.amenityExpense / buildingCount
    : 0
  const waterBottleExpensePerBuilding = buildingCount > 0
    ? globalExpenseTotals.waterBottleExpense / buildingCount
    : 0
  const cookieExpensePerBuilding = buildingCount > 0
    ? globalExpenseTotals.cookieExpense / buildingCount
    : 0
  const coffeeExpensePerBuilding = buildingCount > 0
    ? globalExpenseTotals.coffeeExpense / buildingCount
    : 0
  const fuelExpensePerBuilding = buildingCount > 0
    ? globalExpenseTotals.fuelExpense / buildingCount
    : 0
  const parkingExpensePerBuilding = buildingCount > 0
    ? globalExpenseTotals.parkingExpense / buildingCount
    : 0
  const motorcycleMaintenanceExpensePerBuilding = buildingCount > 0
    ? globalExpenseTotals.motorcycleMaintenanceExpense / buildingCount
    : 0
  const maidTravelExpensePerBuilding = buildingCount > 0
    ? globalExpenseTotals.maidTravelExpense / buildingCount
    : 0
  const cleaningSupplyExpensePerBuilding = buildingCount > 0
    ? globalExpenseTotals.cleaningSupplyExpense / buildingCount
    : 0
  const foodExpensePerBuilding = buildingCount > 0
    ? globalExpenseTotals.foodExpense / buildingCount
    : 0

  // ดึงค่าเช่าเครื่องกรองน้ำ Coway จาก settings (แยกแต่ละอาคาร)
  const cowayWaterFilterExpense = settings ? Number(settings.cowayWaterFilterExpense) : 0

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
  ) + airportShuttleRentIncome + thaiBusTourIncome + coVanKesselIncome

  // คำนวณรายได้ค่าเช่า (สำหรับ Management Fee)
  // เฉพาะหมวดหมู่ที่มีคำว่า "ค่าเช่า" เท่านั้น (ไม่รวมค่าอาหาร, รับส่งสนามบิน, ทัวร์, Thai bus, Co van)
  const rentalIncome = incomeTransactions
    .filter((t) => t.category.name.includes('ค่าเช่า'))
    .reduce((sum, t) => sum + Number(t.amount), 0)

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

  // แยกรายจ่ายตามหมวดหมู่
  const expenseByCategory: Record<string, number> = {}
  expenseTransactions.forEach((t) => {
    expenseByCategory[t.category.name] = Number(t.amount)
  })

  // เพิ่มค่าเช่าอาคารเข้าไปในรายจ่าย (ถ้ามี)
  if (monthlyRentFromSettings > 0) {
    expenseByCategory['ค่าเช่าอาคาร'] = monthlyRentFromSettings
  }

  // เพิ่มค่าเช่าเครื่องกรองน้ำ Coway เข้าไปในรายจ่าย (แสดงเสมอ)
  expenseByCategory['ค่าเช่าเครื่องกรองน้ำ Coway'] = cowayWaterFilterExpense

  // เพิ่มเงินเดือนพนักงานเข้าไปในรายจ่าย (ถ้ามี)
  if (salaryPerBuilding > 0) {
    expenseByCategory['เงินเดือนพนักงาน'] = salaryPerBuilding
  }

  // เพิ่มค่าใช้จ่ายส่วนกลางทั้งหมดเข้าไปในรายจ่าย (แสดงเสมอ)
  // ใช้ชื่อเต็มที่ตรงกับ categories table เพื่อให้หน้า Reports แสดงผลถูกต้อง
  // ค่าดูแล MAX, ค่าดูแลจราจร, ค่าขนส่งสินค้า - หาร 3 อาคาร (NANA, CT, YW)
  if (maxCareExpensePerBuilding > 0) {
    expenseByCategory['ค่าดูแล MAX'] = maxCareExpensePerBuilding
  }
  if (trafficCareExpensePerBuilding > 0) {
    expenseByCategory['ค่าดูแลจราจร'] = trafficCareExpensePerBuilding
  }
  if (shippingExpensePerBuilding > 0) {
    expenseByCategory['ค่าขนส่งสินค้า'] = shippingExpensePerBuilding
  }
  // ค่าใช้จ่ายส่วนกลาง - หารทุกอาคาร (แสดงเสมอแม้เป็น 0)
  // ใช้ชื่อเต็มที่ตรงกับ categories table
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
  // เพิ่มเงินสมทบประกันสังคม (หาร 5 อาคาร)
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
    // ค่าใช้จ่ายส่วนกลางทั้งหมด (หารต่ออาคาร)
    maxCareExpense: maxCareExpensePerBuilding,
    trafficCareExpense: trafficCareExpensePerBuilding,
    shippingExpense: shippingExpensePerBuilding,
    amenityExpense: amenityExpensePerBuilding,
    waterBottleExpense: waterBottleExpensePerBuilding,
    cookieExpense: cookieExpensePerBuilding,
    coffeeExpense: coffeeExpensePerBuilding,
    fuelExpense: fuelExpensePerBuilding,
    parkingExpense: parkingExpensePerBuilding,
    motorcycleMaintenanceExpense: motorcycleMaintenanceExpensePerBuilding,
    maidTravelExpense: maidTravelExpensePerBuilding,
    cleaningSupplyExpense: cleaningSupplyExpensePerBuilding,
    foodExpense: foodExpensePerBuilding,
    // ค่าเช่าเครื่องกรองน้ำ Coway (แยกแต่ละอาคาร)
    cowayWaterFilterExpense,
    // เงินสมทบประกันสังคม (หาร 5 อาคาร)
    socialSecurityExpense: socialSecurityPerBuilding,
    netProfit,
    amountToBePaid,
    incomeByChannel,
    expenseByCategory,
  }
}
