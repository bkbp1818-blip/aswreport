// ฟังก์ชันคำนวณสูตรต่างๆ

export interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  grossProfit: number
  managementFee: number
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
  settings: Settings
): FinancialSummary {
  const { managementFeePercent, vatPercent, monthlyRent, littleHotelierExpense } = settings

  // Gross Profit = รวมรายได้ - รวมค่าใช้จ่าย
  const grossProfit = totalIncome - totalExpense

  // Management Fee = รวมรายได้ × %
  const managementFee = totalIncome * (managementFeePercent / 100)

  // Net Profit = Gross Profit - Management Fee - Little Hotelier - ค่าเช่าอาคาร
  const netProfit = grossProfit - managementFee - littleHotelierExpense - monthlyRent

  // Amount to be paid = Management Fee × (1 + VAT%)
  const amountToBePaid = managementFee * (1 + vatPercent / 100)

  return {
    totalIncome,
    totalExpense,
    grossProfit,
    managementFee,
    littleHotelierExpense,
    monthlyRent,
    netProfit,
    amountToBePaid,
  }
}

// สร้างปีสำหรับ dropdown
export function generateYears(startYear: number = 2020): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let year = currentYear; year >= startYear; year--) {
    years.push(year)
  }
  return years
}
