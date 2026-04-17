// ฟังก์ชันคำนวณสูตรต่างๆ
import { MONTHS } from '@/lib/utils'

// อัตราเงินสมทบประกันสังคม (ฝั่งนายจ้าง) — ตามกฎหมายใหม่ มีผล 1 ม.ค. 2569
// ระยะที่ 1: 2569-2571 → เพดาน 17,500 บาท, สมทบสูงสุด 875 บาท
// ระยะที่ 2: 2572-2574 → เพดาน 20,000 บาท, สมทบสูงสุด 1,000 บาท
// ระยะที่ 3: 2575 เป็นต้นไป → เพดาน 23,000 บาท, สมทบสูงสุด 1,150 บาท
export const SOCIAL_SECURITY_RATE = 0.05 // 5%
export const SOCIAL_SECURITY_SALARY_CAP = 17500 // เพดานเงินเดือน (2569-2571)
export const SOCIAL_SECURITY_MAX = 875 // สูงสุด 875 บาท/คน/เดือน (2569-2571)

// คำนวณเงินสมทบประกันสังคมของพนักงาน 1 คน
export function calculateSocialSecurity(salary: number): number {
  if (salary <= 0) return 0
  return Math.min(salary * SOCIAL_SECURITY_RATE, SOCIAL_SECURITY_MAX)
}

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

  // Funn D buildings (FUNNLP, FUNNS81) สามารถเลือกตั้งแต่เดือนมกราคม 2026 ได้
  if (buildingCode?.startsWith('FUNN')) {
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
