import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - ดึงข้อมูลสรุป
export async function GET(request: NextRequest) {
  try {
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
      littleHotelierExpense: summaries.reduce(
        (sum, s) => sum + s.littleHotelierExpense,
        0
      ),
      monthlyRent: summaries.reduce((sum, s) => sum + s.monthlyRent, 0),
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

  // คำนวณรายรับ
  const incomeTransactions = transactions.filter(
    (t) => t.category.type === 'INCOME'
  )
  const totalIncome = incomeTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  )

  // คำนวณรายจ่าย
  const expenseTransactions = transactions.filter(
    (t) => t.category.type === 'EXPENSE'
  )
  const totalExpense = expenseTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  )

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

  const managementFee = totalIncome * (managementFeePercent / 100)
  const netProfit =
    grossProfit - managementFee - littleHotelierExpense - monthlyRent
  const amountToBePaid = managementFee * (1 + vatPercent / 100)

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
    littleHotelierExpense,
    monthlyRent,
    netProfit,
    amountToBePaid,
    incomeByChannel,
    expenseByCategory,
  }
}
