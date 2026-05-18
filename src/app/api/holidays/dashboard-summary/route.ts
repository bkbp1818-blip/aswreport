import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'
import { leaveBayFetch, LeaveBayError } from '@/lib/leave-bay-client'

interface PendingEmployee {
  id: string
  name: string
  salary: number
  pendingCount: number
  pendingTotal: number
}

interface HistoryRecord {
  id: string
  employeeId: string
  employeeName: string
  holidayName: string
  holidayDate: string
  workDate: string
  paidAt: string
  paidDailyRate: number
  paidOtAmount: number
  paidSalarySnapshot: number
  paymentMethod: string
  paymentReference: string | null
  paidByName: string
  rawNote: string
}

interface HistoryResponse {
  success: boolean
  records: HistoryRecord[]
  summary?: { totalRecords: number; totalAmount: number }
}

// คำนวณยอดสรุป 4 cards ใน response เดียว — รวม 3 sources:
// 1. leave-bay /employees-with-pending → Card รอจ่าย + Card พนักงานค้างจ่าย
// 2. leave-bay /compensatory/history (filter ทั้งปี) → Card จ่ายเดือนนี้/ปีนี้ (ฝั่ง "ใหม่")
// 3. Prisma ExpenseHistory (fieldName=holidayCompensation) → Card จ่ายเดือนนี้/ปีนี้ (ฝั่ง "เก่า")
export async function GET() {
  try {
    await requireMenuAccess('/holidays')

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startOfYearStr = `${year}-01-01`
    const endOfYearStr = `${year}-12-31`

    const [pendingData, historyData, expenseRecords] = await Promise.all([
      leaveBayFetch<PendingEmployee[]>('/api/public/employees-with-pending'),
      leaveBayFetch<HistoryResponse>('/api/public/compensatory/history', {
        query: { startDate: startOfYearStr, endDate: endOfYearStr },
      }),
      prisma.expenseHistory.findMany({
        where: {
          fieldName: 'holidayCompensation',
          year,
          groupId: { not: null },
        },
        select: { amount: true, month: true, groupId: true },
      }),
    ])

    // ----- Card 1: รอจ่าย -----
    const pendingList = Array.isArray(pendingData) ? pendingData : []
    const pendingTotal = pendingList.reduce(
      (s, e) => s + Number(e.pendingTotal || 0),
      0
    )
    const pendingDays = pendingList.reduce(
      (s, e) => s + Number(e.pendingCount || 0),
      0
    )
    const pendingEmployeeCount = pendingList.length

    // ----- Card 2/3: จ่ายเดือนนี้/ปีนี้ -----
    const historyRecords: HistoryRecord[] = Array.isArray(historyData?.records)
      ? historyData.records
      : []

    const newPaidThisYear = historyRecords
    const newPaidThisMonth = historyRecords.filter((r) => {
      const d = new Date(r.paidAt)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })

    const newAmountThisYear = newPaidThisYear.reduce(
      (s, r) => s + Number(r.paidOtAmount || 0),
      0
    )
    const newAmountThisMonth = newPaidThisMonth.reduce(
      (s, r) => s + Number(r.paidOtAmount || 0),
      0
    )

    // นับ ExpenseHistory เก่า — distinct groupId = 1 transaction
    const oldGroupAmountsThisYear = new Map<string, number>()
    const oldGroupAmountsThisMonth = new Map<string, number>()
    for (const r of expenseRecords) {
      if (!r.groupId) continue
      const amt = Number(r.amount)
      oldGroupAmountsThisYear.set(
        r.groupId,
        (oldGroupAmountsThisYear.get(r.groupId) ?? 0) + amt
      )
      if (r.month === month) {
        oldGroupAmountsThisMonth.set(
          r.groupId,
          (oldGroupAmountsThisMonth.get(r.groupId) ?? 0) + amt
        )
      }
    }
    const oldAmountThisYear = Array.from(oldGroupAmountsThisYear.values()).reduce(
      (s, v) => s + v,
      0
    )
    const oldAmountThisMonth = Array.from(oldGroupAmountsThisMonth.values()).reduce(
      (s, v) => s + v,
      0
    )
    const oldCountThisYear = oldGroupAmountsThisYear.size
    const oldCountThisMonth = oldGroupAmountsThisMonth.size

    // ----- Card 4: พนักงานค้างจ่าย -----
    const avgPerEmployee =
      pendingEmployeeCount > 0 ? pendingTotal / pendingEmployeeCount : 0

    return NextResponse.json({
      pending: {
        totalAmount: pendingTotal,
        employeeCount: pendingEmployeeCount,
        totalDays: pendingDays,
      },
      paidThisMonth: {
        totalAmount: newAmountThisMonth + oldAmountThisMonth,
        totalCount: newPaidThisMonth.length + oldCountThisMonth,
        newAmount: newAmountThisMonth,
        newCount: newPaidThisMonth.length,
        oldAmount: oldAmountThisMonth,
        oldCount: oldCountThisMonth,
      },
      paidThisYear: {
        totalAmount: newAmountThisYear + oldAmountThisYear,
        totalCount: newPaidThisYear.length + oldCountThisYear,
        newAmount: newAmountThisYear,
        newCount: newPaidThisYear.length,
        oldAmount: oldAmountThisYear,
        oldCount: oldCountThisYear,
      },
      employeesWithPending: {
        count: pendingEmployeeCount,
        avgPerEmployee,
      },
      generatedAt: now.toISOString(),
      currentMonth: month,
      currentYear: year,
    })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    if (error instanceof LeaveBayError) {
      return NextResponse.json(
        { error: error.message, ...(error.code ? { code: error.code } : {}) },
        { status: error.status }
      )
    }
    console.error('dashboard-summary error:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสรุปข้อมูล' }, { status: 500 })
  }
}
