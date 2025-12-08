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

    // คำนวณยอดรวมทั้งหมด
    const totalSummary = {
      buildingId: null,
      buildingName: 'รวมทั้งหมด',
      totalIncome: summaries.reduce((sum, s) => sum + s.totalIncome, 0),
      totalExpense: summaries.reduce((sum, s) => sum + s.totalExpense, 0),
      grossProfit: summaries.reduce((sum, s) => sum + s.grossProfit, 0),
      managementFee: summaries.reduce((sum, s) => sum + s.managementFee, 0),
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
      netProfit: summaries.reduce((sum, s) => sum + s.netProfit, 0),
      amountToBePaid: summaries.reduce((sum, s) => sum + s.amountToBePaid, 0),
      incomeByChannel: {},
      expenseByCategory: {},
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

  // ดึง transactions ของเดือนนี้
  const transactions = await prisma.transaction.findMany({
    where: {
      buildingId,
      month,
      year,
    },
    include: { category: true },
  })

  // ดึงข้อมูลเงินเดือนพนักงาน (คำนวณจาก employees table)
  const buildings = await prisma.building.findMany()
  const buildingCount = buildings.length
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
  })
  const totalSalary = employees.reduce((sum, emp) => sum + Number(emp.salary), 0)
  const salaryPerBuilding = buildingCount > 0 ? totalSalary / buildingCount : 0

  // ดึง GlobalSettings สำหรับค่าใช้จ่ายส่วนกลางทั้งหมด
  const globalSettings = await prisma.globalSettings.findFirst()

  // ค่าดูแล MAX และค่าดูแลจราจร หารเฉพาะ 3 อาคาร (NANA, CT, YW) - ไม่รวม Funn D
  const eligibleBuildingsForCare = ['NANA', 'CT', 'YW']
  const isEligibleForCareExpense = eligibleBuildingsForCare.includes(building.code)
  const careExpenseDivisor = 3 // จำนวนอาคารที่ร่วมจ่ายค่าดูแล

  const maxCareExpensePerBuilding = globalSettings && isEligibleForCareExpense
    ? Number(globalSettings.maxCareExpense) / careExpenseDivisor
    : 0
  const trafficCareExpensePerBuilding = globalSettings && isEligibleForCareExpense
    ? Number(globalSettings.trafficCareExpense) / careExpenseDivisor
    : 0
  const shippingExpensePerBuilding = globalSettings && isEligibleForCareExpense
    ? Number(globalSettings.shippingExpense) / careExpenseDivisor
    : 0
  const amenityExpensePerBuilding = globalSettings && buildingCount > 0
    ? Number(globalSettings.amenityExpense) / buildingCount
    : 0
  const waterBottleExpensePerBuilding = globalSettings && buildingCount > 0
    ? Number(globalSettings.waterBottleExpense) / buildingCount
    : 0
  const cookieExpensePerBuilding = globalSettings && buildingCount > 0
    ? Number(globalSettings.cookieExpense) / buildingCount
    : 0
  const coffeeExpensePerBuilding = globalSettings && buildingCount > 0
    ? Number(globalSettings.coffeeExpense) / buildingCount
    : 0
  const fuelExpensePerBuilding = globalSettings && buildingCount > 0
    ? Number(globalSettings.fuelExpense) / buildingCount
    : 0
  const parkingExpensePerBuilding = globalSettings && buildingCount > 0
    ? Number(globalSettings.parkingExpense) / buildingCount
    : 0
  const motorcycleMaintenanceExpensePerBuilding = globalSettings && buildingCount > 0
    ? Number(globalSettings.motorcycleMaintenanceExpense) / buildingCount
    : 0
  const maidTravelExpensePerBuilding = globalSettings && buildingCount > 0
    ? Number(globalSettings.maidTravelExpense) / buildingCount
    : 0

  // รวมค่าใช้จ่ายส่วนกลางทั้งหมด
  const totalGlobalExpensePerBuilding = maxCareExpensePerBuilding + trafficCareExpensePerBuilding +
    shippingExpensePerBuilding + amenityExpensePerBuilding + waterBottleExpensePerBuilding +
    cookieExpensePerBuilding + coffeeExpensePerBuilding + fuelExpensePerBuilding + parkingExpensePerBuilding +
    motorcycleMaintenanceExpensePerBuilding + maidTravelExpensePerBuilding

  // คำนวณรายรับ
  const incomeTransactions = transactions.filter(
    (t) => t.category.type === 'INCOME'
  )
  const totalIncome = incomeTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  )

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
  // รวมค่าใช้จ่าย = transactions (ไม่รวมเงินเดือน) + ค่าเช่าอาคาร + เงินเดือนพนักงาน + ค่าใช้จ่ายส่วนกลางทั้งหมด
  const totalExpense = transactionExpenseExcludeSalary + monthlyRentFromSettings + salaryPerBuilding + totalGlobalExpensePerBuilding

  // แยกรายรับตามช่องทาง
  const incomeByChannel: Record<string, number> = {}
  incomeTransactions.forEach((t) => {
    incomeByChannel[t.category.name] = Number(t.amount)
  })

  // แยกรายจ่ายตามหมวดหมู่
  const expenseByCategory: Record<string, number> = {}
  expenseTransactions.forEach((t) => {
    expenseByCategory[t.category.name] = Number(t.amount)
  })

  // เพิ่มค่าเช่าอาคารเข้าไปในรายจ่าย (ถ้ามี)
  if (monthlyRentFromSettings > 0) {
    expenseByCategory['ค่าเช่าอาคาร'] = monthlyRentFromSettings
  }

  // เพิ่มเงินเดือนพนักงานเข้าไปในรายจ่าย (ถ้ามี)
  if (salaryPerBuilding > 0) {
    expenseByCategory['เงินเดือนพนักงาน'] = salaryPerBuilding
  }

  // เพิ่มค่าใช้จ่ายส่วนกลางทั้งหมดเข้าไปในรายจ่าย (ถ้ามี)
  if (maxCareExpensePerBuilding > 0) {
    expenseByCategory['ค่าดูแล MAX'] = maxCareExpensePerBuilding
  }
  if (trafficCareExpensePerBuilding > 0) {
    expenseByCategory['ค่าดูแลจราจร'] = trafficCareExpensePerBuilding
  }
  if (shippingExpensePerBuilding > 0) {
    expenseByCategory['ค่าขนส่งสินค้า'] = shippingExpensePerBuilding
  }
  if (amenityExpensePerBuilding > 0) {
    expenseByCategory['ค่า Amenity'] = amenityExpensePerBuilding
  }
  if (waterBottleExpensePerBuilding > 0) {
    expenseByCategory['ค่าน้ำเปล่า'] = waterBottleExpensePerBuilding
  }
  if (cookieExpensePerBuilding > 0) {
    expenseByCategory['ค่าขนมคุ้กกี้'] = cookieExpensePerBuilding
  }
  if (coffeeExpensePerBuilding > 0) {
    expenseByCategory['ค่ากาแฟ'] = coffeeExpensePerBuilding
  }
  if (fuelExpensePerBuilding > 0) {
    expenseByCategory['ค่าน้ำมัน'] = fuelExpensePerBuilding
  }
  if (parkingExpensePerBuilding > 0) {
    expenseByCategory['ค่าเช่าที่จอดรถ'] = parkingExpensePerBuilding
  }
  if (motorcycleMaintenanceExpensePerBuilding > 0) {
    expenseByCategory['ค่าซ่อมบำรุงรถ'] = motorcycleMaintenanceExpensePerBuilding
  }
  if (maidTravelExpensePerBuilding > 0) {
    expenseByCategory['ค่าเดินทางแม่บ้าน'] = maidTravelExpensePerBuilding
  }

  // คำนวณตามสูตร
  const grossProfit = totalIncome - totalExpense
  const managementFeePercent = settings
    ? Number(settings.managementFeePercent)
    : 13.5
  const vatPercent = settings ? Number(settings.vatPercent) : 7
  const monthlyRent = settings ? Number(settings.monthlyRent) : 0
  const littleHotelierExpense = settings
    ? Number(settings.littleHotelierExpense)
    : 0

  // อาคาร Funn D (FUNNS81, FUNNLP) ไม่คำนวณ Management Fee และ VAT
  const isExemptBuilding = ['FUNNS81', 'FUNNLP'].includes(building.code)

  // Management Fee คำนวณจากรายได้ค่าเช่าเท่านั้น (ไม่รวมค่าอาหาร, รับส่งสนามบิน, ทัวร์, Thai bus, Co van)
  const managementFee = isExemptBuilding ? 0 : rentalIncome * (managementFeePercent / 100)
  const vat = isExemptBuilding ? 0 : managementFee * (vatPercent / 100)
  // monthlyRent รวมอยู่ใน totalExpense แล้ว (ถูกหักใน grossProfit) จึงไม่ต้องหักอีก
  // Net Profit หัก VAT ด้วย เพราะ VAT เป็นรายจ่ายที่ต้องจ่ายจริง
  const netProfit = grossProfit - managementFee - littleHotelierExpense - vat
  const amountToBePaid = managementFee + vat

  return {
    buildingId,
    buildingName: building.name,
    buildingCode: building.code,
    month,
    year,
    totalIncome,
    totalExpense,
    grossProfit,
    managementFeePercent,
    managementFee,
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
    netProfit,
    amountToBePaid,
    incomeByChannel,
    expenseByCategory,
  }
}
