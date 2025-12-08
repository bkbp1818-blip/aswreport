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
// rentalIncome = รายได้ค่าเช่าเท่านั้น (ไม่รวมค่าอาหาร, รับส่งสนามบิน, ทัวร์, Thai bus, Co van)
export function calculateFinancialSummary(
  totalIncome: number,
  totalExpense: number,
  settings: Settings,
  rentalIncome?: number // รายได้ค่าเช่าสำหรับคำนวณ Management Fee (ถ้าไม่ระบุจะใช้ totalIncome)
): FinancialSummary {
  const { managementFeePercent, vatPercent, monthlyRent, littleHotelierExpense } = settings

  // Gross Profit = รวมรายได้ - รวมค่าใช้จ่าย (รวมค่าเช่าอาคารแล้ว)
  const grossProfit = totalIncome - totalExpense

  // Management Fee = รายได้ค่าเช่า × % (ไม่รวมรายได้จากค่าอาหาร, รับส่งสนามบิน, ทัวร์, Thai bus, Co van)
  const incomeForManagementFee = rentalIncome ?? totalIncome
  const managementFee = incomeForManagementFee * (managementFeePercent / 100)

  // VAT = Management Fee × VAT%
  const vat = managementFee * (vatPercent / 100)

  // Net Profit = Gross Profit - Management Fee - VAT - Little Hotelier
  // (ค่าเช่าอาคารรวมอยู่ใน totalExpense แล้ว ไม่ต้องหักซ้ำ)
  const netProfit = grossProfit - managementFee - vat - littleHotelierExpense

  // Amount to be paid = Management Fee + VAT
  const amountToBePaid = managementFee + vat

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
export function generateYears(startYear: number = 2020): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let year = currentYear; year >= startYear; year--) {
    years.push(year)
  }
  return years
}
