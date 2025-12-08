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
      month,
      year,
      totalIncome: 0,
      totalExpense: 0,
      grossProfit: 0,
      netProfit: 0,
    }
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
  const monthlyRent = settings ? Number(settings.monthlyRent) : 0
  // รวมค่าใช้จ่าย = transactions (ไม่รวมเงินเดือน) + ค่าเช่าอาคาร + เงินเดือนพนักงาน
  const totalExpense = transactionExpenseExcludeSalary + monthlyRent + salaryPerBuilding

  // แยกรายรับตามช่องทาง
  const incomeByChannel: Record<string, number> = {}
  incomeTransactions.forEach((t) => {
    incomeByChannel[t.category.name] = Number(t.amount)
  })

  // แยกรายจ่ายตามหมวดหมู่
  const expenseByCategory: Record<string, number> = {}
  expenseTransactions.forEach((t) => {
    if (t.category.name !== 'เงินเดือนพนักงาน') {
      expenseByCategory[t.category.name] = Number(t.amount)
    }
  })

  // เพิ่มค่าเช่าอาคารเข้าไปในรายจ่าย (ถ้ามี)
  if (monthlyRent > 0) {
    expenseByCategory['ค่าเช่าอาคาร'] = monthlyRent
  }

  // เพิ่มเงินเดือนพนักงานเข้าไปในรายจ่าย (ถ้ามี)
  if (salaryPerBuilding > 0) {
    expenseByCategory['เงินเดือนพนักงาน'] = salaryPerBuilding
  }

  // คำนวณตามสูตร
  const grossProfit = totalIncome - totalExpense
  const managementFeePercent = settings
    ? Number(settings.managementFeePercent)
    : 13.5
  const vatPercent = settings ? Number(settings.vatPercent) : 7
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
    netProfit,
    amountToBePaid: managementFee + vat,
    incomeByChannel,
    expenseByCategory,
  }
}
