// ฟังก์ชันคำนวณสูตรต่างๆ
import { MONTHS } from '@/lib/utils'

export interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  grossProfit: number
  managementFee: number
  vat: number
  littleHotelierExpense: number
  monthlyRent: number
  netProfit: number
  amountToBePaid: number
}

export interface Settings {
  managementFeePercent: number
  vatPercent: number
  monthlyRent: number
  littleHotelierExpense: number
}

// คำนวณสรุปการเงิน
export function calculateFinancialSummary(
  totalIncome: number,
  totalExpense: number,
  settings: Settings,
): FinancialSummary {
  const { monthlyRent, littleHotelierExpense } = settings

  // Gross Profit = รวมรายได้ - รวมค่าใช้จ่าย (รวมค่าเช่าอาคารแล้ว)
  const grossProfit = totalIncome - totalExpense

  // Management Fee ถูกลบออกแล้ว — ตั้งเป็น 0
  const managementFee = 0

  // VAT คำนวณจาก Management Fee ซึ่งเป็น 0 — จึงเป็น 0
  const vat = 0

  // Net Profit = Gross Profit - Little Hotelier
  const netProfit = grossProfit - littleHotelierExpense

  // Amount to be paid = 0 (ไม่มี Management Fee แล้ว)
  const amountToBePaid = 0

  return {
    totalIncome,
    totalExpense,
    grossProfit,
    managementFee,
    vat,
    littleHotelierExpense,
    monthlyRent,
    netProfit,
    amountToBePaid,
  }
}

// จุดเริ่มต้นข้อมูล: กุมภาพันธ์ 2026
export const DATA_START_MONTH = 2
export const DATA_START_YEAR = 2026

// กรองเดือนที่แสดงตามปีที่เลือก (ปี 2026 แสดงตั้งแต่ กพ. เป็นต้นไป)
// ยกเว้นอาคาร FD ที่สามารถเลือกตั้งแต่เดือนมกราคม 2026 ได้
export function getAvailableMonths(
  selectedYear: string | number,
  buildingCode?: string
): { value: number; label: string }[] {
  const year = typeof selectedYear === 'string' ? parseInt(selectedYear) : selectedYear

  // FD building สามารถเลือกตั้งแต่เดือนมกราคม 2026 ได้
  if (buildingCode === 'FD') {
    return MONTHS
  }

  // อาคารอื่นๆ ปี 2026 เริ่มที่กุมภาพันธ์
  if (year === DATA_START_YEAR) {
    return MONTHS.filter((m) => m.value >= DATA_START_MONTH)
  }
  return MONTHS
}

// สร้างปีสำหรับ dropdown
export function generateYears(startYear: number = 2026, futureYears: number = 5): number[] {
  const currentYear = new Date().getFullYear()
  const endYear = currentYear + futureYears
  const years: number[] = []
  for (let year = endYear; year >= startYear; year--) {
    years.push(year)
  }
  return years
}
