// ฟังก์ชันคำนวณสูตรต่างๆ

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

// สร้างปีสำหรับ dropdown
export function generateYears(startYear: number = 2020, futureYears: number = 5): number[] {
  const currentYear = new Date().getFullYear()
  const endYear = currentYear + futureYears
  const years: number[] = []
  for (let year = endYear; year >= startYear; year--) {
    years.push(year)
  }
  return years
}
