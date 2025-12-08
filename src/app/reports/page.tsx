'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatNumber, MONTHS, getMonthName } from '@/lib/utils'
import { generateYears } from '@/lib/calculations'
import { FileDown, Loader2, Printer, Building2, FileText, TrendingUp, TrendingDown, Wallet, Calculator, Receipt } from 'lucide-react'
import { CategoryIcon } from '@/lib/category-icons'
import { getBuildingColor, getBuildingColorByIndex } from '@/lib/building-colors'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface Building {
  id: number
  name: string
  code: string
}

interface Summary {
  buildingId: number | null
  buildingName: string
  buildingCode?: string
  totalIncome: number
  totalExpense: number
  grossProfit: number
  managementFee: number
  managementFeePercent: number
  vatPercent: number
  vat: number
  littleHotelierExpense: number
  monthlyRent: number
  netProfit: number
  amountToBePaid: number
  incomeByChannel: Record<string, number>
  expenseByCategory: Record<string, number>
}

interface AllSummaryData {
  buildings: Summary[]
  total: Summary
}

export default function ReportsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  )
  const [summaryData, setSummaryData] = useState<Summary | null>(null)
  const [allSummaryData, setAllSummaryData] = useState<AllSummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)

  const years = generateYears()

  // โหลดรายการอาคาร
  useEffect(() => {
    fetch('/api/buildings')
      .then((res) => res.json())
      .then((data) => setBuildings(data))
      .catch((err) => console.error('Error loading buildings:', err))
  }, [])

  // โหลดข้อมูลสรุป
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      month: selectedMonth,
      year: selectedYear,
    })
    if (selectedBuilding !== 'all') {
      params.append('buildingId', selectedBuilding)
    }

    fetch(`/api/summary?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (selectedBuilding !== 'all') {
          setSummaryData(data)
          setAllSummaryData(null)
        } else {
          setSummaryData(data.total)
          setAllSummaryData(data)
        }
      })
      .catch((err) => console.error('Error loading summary:', err))
      .finally(() => setLoading(false))
  }, [selectedBuilding, selectedMonth, selectedYear])

  const selectedBuildingName =
    selectedBuilding === 'all'
      ? 'ทุกอาคาร'
      : buildings.find((b) => String(b.id) === selectedBuilding)?.name || ''

  // ฟังก์ชันแปลงชื่อ category เป็น emoji สำหรับ PDF
  const getCategoryEmoji = (name: string): string => {
    const lowerName = name.toLowerCase()

    // รายได้ - ช่องทางการจอง
    if (lowerName.includes('direct booking')) return '💳'
    if (lowerName.includes('airbnb')) return '🏠'
    if (lowerName.includes('booking') && !lowerName.includes('direct')) return '🛏️'
    if (lowerName.includes('agoda')) return '🌐'
    if (lowerName.includes('trip')) return '✈️'
    if (lowerName.includes('expedia')) return '🌍'
    if (lowerName.includes('rb') || lowerName.includes('roombix')) return '🏨'
    if (lowerName.includes('ช่องทางอื่น')) return '💰'

    // รายได้ - Upsell
    if (lowerName.includes('ค่าเช่า')) return '🏠'
    if (lowerName.includes('อาหาร')) return '🍽️'
    if (lowerName.includes('สนามบิน') || lowerName.includes('รับส่ง')) return '🚗'
    if (lowerName.includes('ทัวร์') && !lowerName.includes('thai bus')) return '🗺️'
    if (lowerName.includes('thai bus')) return '🚌'
    if (lowerName.includes('co van kessel')) return '🗺️'

    // รายจ่าย
    if (lowerName.includes('ค่าเช่าอาคาร')) return '🏢'
    if (lowerName.includes('ไฟฟ้า')) return '⚡'
    if (lowerName.includes('น้ำประปา') || lowerName.includes('ประปา')) return '💧'
    if (lowerName.includes('internet')) return '📶'
    if (lowerName.includes('netflix')) return '📺'
    if (lowerName.includes('youtube')) return '▶️'
    if (lowerName.includes('เงินเดือน') || lowerName.includes('พนักงาน')) return '👥'
    if (lowerName.includes('การตลาด')) return '📢'
    if (lowerName.includes('amenity') || lowerName.includes('แปรงสีฟัน')) return '📦'
    if (lowerName.includes('น้ำเปล่า')) return '💧'
    if (lowerName.includes('คุ้กกี้') || lowerName.includes('ขนม')) return '🍪'
    if (lowerName.includes('กาแฟ') || lowerName.includes('คอฟฟี่')) return '☕'
    if (lowerName.includes('น้ำมัน')) return '⛽'
    if (lowerName.includes('ที่จอดรถ') || lowerName.includes('เช่าที่จอด')) return '🅿️'
    if (lowerName.includes('ซ่อมบำรุงรถ') || lowerName.includes('มอเตอร์ไซค์')) return '🔧'
    if (lowerName.includes('ซ่อมบำรุงอาคาร')) return '🏗️'
    if (lowerName.includes('เดินทาง') || lowerName.includes('แม่บ้าน')) return '🚌'
    if (lowerName.includes('little hotelier') || lowerName.includes('hotelier')) return '🏨'

    // Default
    return '📋'
  }

  // ฟังก์ชันสร้างกราฟแท่งแบบ HTML/CSS
  const createBarChart = (income: number, expense: number, profit: number): string => {
    const maxVal = Math.max(income, expense, Math.abs(profit)) || 1
    const incomePercent = (income / maxVal) * 100
    const expensePercent = (expense / maxVal) * 100
    const profitPercent = (Math.abs(profit) / maxVal) * 100

    return `
      <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <div style="font-weight: bold; margin-bottom: 12px; color: #333; font-size: 13px;">📊 กราฟเปรียบเทียบ</div>

        <!-- รายรับ -->
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; color: #5a7d75;">รายรับ</span>
            <span style="font-size: 11px; font-weight: bold; color: #5a7d75;">${formatNumber(income)}</span>
          </div>
          <div style="background: #e0e0e0; border-radius: 4px; height: 20px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #84A59D, #5a7d75); width: ${incomePercent}%; height: 100%; border-radius: 4px;"></div>
          </div>
        </div>

        <!-- รายจ่าย -->
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; color: #d96f6d;">รายจ่าย</span>
            <span style="font-size: 11px; font-weight: bold; color: #d96f6d;">${formatNumber(expense)}</span>
          </div>
          <div style="background: #e0e0e0; border-radius: 4px; height: 20px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #F28482, #d96f6d); width: ${expensePercent}%; height: 100%; border-radius: 4px;"></div>
          </div>
        </div>

        <!-- กำไรสุทธิ -->
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; color: #b8893f;">กำไรสุทธิ</span>
            <span style="font-size: 11px; font-weight: bold; color: ${profit >= 0 ? '#b8893f' : '#d96f6d'};">${formatNumber(profit)}</span>
          </div>
          <div style="background: #e0e0e0; border-radius: 4px; height: 20px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, ${profit >= 0 ? '#F6BD60, #b8893f' : '#F28482, #d96f6d'}); width: ${profitPercent}%; height: 100%; border-radius: 4px;"></div>
          </div>
        </div>
      </div>
    `
  }

  // สร้าง PDF Header
  const createPDFHeader = (buildingName: string, pageNumber?: number, totalPages?: number): string => {
    const monthYear = `${getMonthName(parseInt(selectedMonth))} ${selectedYear}`
    return `
      <!-- Header with Logo -->
      <div style="background: linear-gradient(135deg, #84A59D 0%, #6b8a84 100%); padding: 15px 25px; color: white;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 40px; height: 40px; background: #F6BD60; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 16px; font-weight: bold; color: #84A59D;">ASW</span>
            </div>
            <div>
              <h1 style="margin: 0; font-size: 16px; font-weight: bold;">ARUN SA WAD</h1>
              <p style="margin: 0; font-size: 10px; opacity: 0.9;">Monthly Financial Report</p>
            </div>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 11px; opacity: 0.9;">รายงานประจำเดือน</p>
            <p style="margin: 0; font-size: 14px; font-weight: bold;">${monthYear}</p>
          </div>
        </div>
      </div>
      <!-- Building Title Bar -->
      <div style="background: #F6BD60; padding: 10px 25px;">
        <h2 style="margin: 0; font-size: 14px; color: #333; font-weight: bold;">📍 ${buildingName}</h2>
      </div>
    `
  }

  // สร้าง PDF Footer
  const createPDFFooter = (pageNumber?: number, totalPages?: number): string => {
    return `
      <div style="background: #f8f9fa; border-top: 1px solid #e5e5e5; padding: 10px 25px; display: flex; justify-content: space-between; align-items: center;">
        <div style="color: #999; font-size: 9px;">
          <p style="margin: 0;">พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</p>
        </div>
        ${pageNumber && totalPages ? `
          <div style="color: #666; font-size: 10px; font-weight: 500;">
            หน้า ${pageNumber} / ${totalPages}
          </div>
        ` : ''}
        <div style="color: #999; font-size: 9px;">
          <p style="margin: 0;">ARUN SA WAD Report</p>
        </div>
      </div>
    `
  }

  // หน้า 1: ตารางรายรับ/รายจ่าย (พอดี 1 หน้า - ลดขนาดให้กระชับ)
  const createPDFPage1 = (data: Summary, buildingName: string, pageNumber?: number, totalPages?: number): string => {
    const incomeEntries = Object.entries(data.incomeByChannel || {}).filter(([, v]) => v > 0)
    const expenseEntries = Object.entries(data.expenseByCategory || {}).filter(([, v]) => v > 0)

    // จัดเรียงรายจ่าย: ค่าเช่าอาคาร, เงินเดือนพนักงาน, อื่นๆ
    const rentEntry = expenseEntries.find(([name]) => name === 'ค่าเช่าอาคาร')
    const salaryEntry = expenseEntries.find(([name]) => name === 'เงินเดือนพนักงาน')
    const otherExpenseEntries = expenseEntries.filter(([name]) => name !== 'ค่าเช่าอาคาร' && name !== 'เงินเดือนพนักงาน')
    const sortedExpenseEntries: [string, number][] = []
    if (rentEntry) sortedExpenseEntries.push(rentEntry)
    if (salaryEntry) sortedExpenseEntries.push(salaryEntry)
    sortedExpenseEntries.push(...otherExpenseEntries)

    // คำนวณขนาด font ตามจำนวนรายการ (ถ้ามีหลายรายการให้ลดขนาด)
    const maxRows = Math.max(incomeEntries.length, sortedExpenseEntries.length)
    const fontSize = maxRows > 12 ? '10px' : maxRows > 8 ? '11px' : '12px'
    const cellPadding = maxRows > 12 ? '6px 8px' : maxRows > 8 ? '7px 10px' : '8px 10px'
    const headerPadding = maxRows > 12 ? '6px' : '8px'

    return `
      <div style="font-family: 'Sarabun', Arial, sans-serif; padding: 0; background: white; color: #333; width: 750px; min-height: 1050px; display: flex; flex-direction: column; box-sizing: border-box;">
        ${createPDFHeader(buildingName, pageNumber, totalPages)}

        <!-- Main Content -->
        <div style="flex: 1; padding: 15px 20px;">
          <div style="display: flex; gap: 15px; height: 100%;">
            <!-- รายรับ -->
            <div style="flex: 1; display: flex; flex-direction: column;">
              <div style="background: linear-gradient(135deg, #84A59D 0%, #6b8a84 100%); color: white; padding: 8px 12px; border-radius: 6px 6px 0 0; font-size: 13px;">
                <strong>📈 รายรับ</strong>
              </div>
              <div style="border: 2px solid #84A59D30; border-top: none; border-radius: 0 0 6px 6px; overflow: hidden; flex: 1;">
                <table style="width: 100%; border-collapse: collapse; font-size: ${fontSize};">
                  <thead>
                    <tr style="background: #84A59D15;">
                      <th style="padding: ${headerPadding}; text-align: left; border-bottom: 1px solid #84A59D30; width: 25px;">#</th>
                      <th style="padding: ${headerPadding}; text-align: left; border-bottom: 1px solid #84A59D30;">รายการ</th>
                      <th style="padding: ${headerPadding}; text-align: right; border-bottom: 1px solid #84A59D30; width: 80px;">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${incomeEntries.length > 0 ? incomeEntries.map(([name, amount], i) => `
                      <tr style="background: ${i % 2 === 0 ? 'white' : '#f9fafb'};">
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; color: #666;">${i + 1}</td>
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">
                          <span style="margin-right: 4px;">${getCategoryEmoji(name)}</span>${name}
                        </td>
                        <td style="padding: ${cellPadding}; text-align: right; border-bottom: 1px solid #eee; font-weight: 500;">${formatNumber(amount)}</td>
                      </tr>
                    `).join('') : `
                      <tr><td colspan="3" style="padding: 15px; text-align: center; color: #999;">ไม่มีรายการ</td></tr>
                    `}
                  </tbody>
                  <tfoot>
                    <tr style="background: linear-gradient(to right, #84A59D30, #84A59D50);">
                      <td colspan="2" style="padding: 10px; font-weight: bold; color: #5a7d75; font-size: 12px;">รวมรายได้</td>
                      <td style="padding: 10px; text-align: right; font-weight: bold; color: #5a7d75; font-size: 13px;">${formatNumber(data.totalIncome)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- รายจ่าย -->
            <div style="flex: 1; display: flex; flex-direction: column;">
              <div style="background: linear-gradient(135deg, #F28482 0%, #d96f6d 100%); color: white; padding: 8px 12px; border-radius: 6px 6px 0 0; font-size: 13px;">
                <strong>📉 รายจ่าย</strong>
              </div>
              <div style="border: 2px solid #F2848230; border-top: none; border-radius: 0 0 6px 6px; overflow: hidden; flex: 1;">
                <table style="width: 100%; border-collapse: collapse; font-size: ${fontSize};">
                  <thead>
                    <tr style="background: #F2848215;">
                      <th style="padding: ${headerPadding}; text-align: left; border-bottom: 1px solid #F2848230; width: 25px;">#</th>
                      <th style="padding: ${headerPadding}; text-align: left; border-bottom: 1px solid #F2848230;">รายการ</th>
                      <th style="padding: ${headerPadding}; text-align: right; border-bottom: 1px solid #F2848230; width: 80px;">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sortedExpenseEntries.length > 0 ? sortedExpenseEntries.map(([name, amount], i) => {
                      const isRent = name === 'ค่าเช่าอาคาร'
                      const isSalary = name === 'เงินเดือนพนักงาน'
                      const bgColor = isRent ? '#F6BD6020' : isSalary ? '#84A59D15' : (i % 2 === 0 ? 'white' : '#fef7f7')
                      return `
                      <tr style="background: ${bgColor};">
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; color: #666;">${i + 1}</td>
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">
                          <span style="margin-right: 4px;">${getCategoryEmoji(name)}</span>${name}
                        </td>
                        <td style="padding: ${cellPadding}; text-align: right; border-bottom: 1px solid #eee; font-weight: 500;">${formatNumber(amount)}</td>
                      </tr>
                    `}).join('') : `
                      <tr><td colspan="3" style="padding: 15px; text-align: center; color: #999;">ไม่มีรายการ</td></tr>
                    `}
                  </tbody>
                  <tfoot>
                    <tr style="background: linear-gradient(to right, #F2848230, #F2848250);">
                      <td colspan="2" style="padding: 10px; font-weight: bold; color: #d96f6d; font-size: 12px;">รวมค่าใช้จ่าย</td>
                      <td style="padding: 10px; text-align: right; font-weight: bold; color: #d96f6d; font-size: 13px;">${formatNumber(data.totalExpense)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        ${createPDFFooter(pageNumber, totalPages)}
      </div>
    `
  }

  // หน้า 3: กราฟแท่ง
  const createPDFPage3 = (data: Summary, buildingName: string, pageNumber?: number, totalPages?: number): string => {
    return `
      <div style="font-family: 'Sarabun', Arial, sans-serif; padding: 0; background: white; color: #333; width: 750px; min-height: 1050px; display: flex; flex-direction: column; box-sizing: border-box;">
        ${createPDFHeader(buildingName, pageNumber, totalPages)}

        <!-- Main Content -->
        <div style="flex: 1; padding: 25px;">
          <div style="background: linear-gradient(135deg, #5B9BD5 0%, #4a86c7 100%); color: white; padding: 15px 20px; border-radius: 10px 10px 0 0; font-size: 16px;">
            <strong>📊 กราฟเปรียบเทียบ รายรับ-รายจ่าย-กำไรสุทธิ</strong>
          </div>
          <div style="border: 2px solid #5B9BD530; border-top: none; border-radius: 0 0 10px 10px; padding: 30px; background: #f8f9fa;">
            ${createLargeBarChart(data.totalIncome, data.totalExpense, data.netProfit)}
          </div>
        </div>

        <!-- Footer -->
        ${createPDFFooter(pageNumber, totalPages)}
      </div>
    `
  }

  // กราฟแท่งขนาดใหญ่สำหรับหน้า 3
  const createLargeBarChart = (income: number, expense: number, profit: number): string => {
    const maxVal = Math.max(income, expense, Math.abs(profit)) || 1
    const incomePercent = (income / maxVal) * 100
    const expensePercent = (expense / maxVal) * 100
    const profitPercent = (Math.abs(profit) / maxVal) * 100

    return `
      <div style="padding: 20px;">
        <!-- รายรับ -->
        <div style="margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 16px; font-weight: bold; color: #5a7d75;">📈 รายรับ</span>
            <span style="font-size: 18px; font-weight: bold; color: #5a7d75;">${formatNumber(income)} บาท</span>
          </div>
          <div style="background: #e0e0e0; border-radius: 8px; height: 50px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(90deg, #84A59D, #5a7d75); width: ${incomePercent}%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 14px;">${incomePercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <!-- รายจ่าย -->
        <div style="margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 16px; font-weight: bold; color: #d96f6d;">📉 รายจ่าย</span>
            <span style="font-size: 18px; font-weight: bold; color: #d96f6d;">${formatNumber(expense)} บาท</span>
          </div>
          <div style="background: #e0e0e0; border-radius: 8px; height: 50px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(90deg, #F28482, #d96f6d); width: ${expensePercent}%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 14px;">${expensePercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <!-- กำไรสุทธิ -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 16px; font-weight: bold; color: ${profit >= 0 ? '#b8893f' : '#d96f6d'};">⭐ กำไรสุทธิ (Net Profit)</span>
            <span style="font-size: 20px; font-weight: bold; color: ${profit >= 0 ? '#b8893f' : '#d96f6d'};">${formatNumber(profit)} บาท</span>
          </div>
          <div style="background: #e0e0e0; border-radius: 8px; height: 60px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(90deg, ${profit >= 0 ? '#F6BD60, #b8893f' : '#F28482, #d96f6d'}); width: ${profitPercent}%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 16px;">${profitPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <!-- สรุปสั้นๆ -->
        <div style="margin-top: 40px; padding: 20px; background: white; border-radius: 10px; border: 2px solid #F6BD6050;">
          <div style="text-align: center;">
            <div style="font-size: 14px; color: #666; margin-bottom: 10px;">อัตราส่วนกำไรสุทธิ</div>
            <div style="font-size: 36px; font-weight: bold; color: ${profit >= 0 ? '#b8893f' : '#d96f6d'};">
              ${income > 0 ? ((profit / income) * 100).toFixed(1) : 0}%
            </div>
            <div style="font-size: 12px; color: #999; margin-top: 5px;">ของรายรับทั้งหมด</div>
          </div>
        </div>
      </div>
    `
  }

  // หน้า 2: สรุปผลประกอบการ
  const createPDFPage2 = (data: Summary, buildingName: string, pageNumber?: number, totalPages?: number): string => {
    return `
      <div style="font-family: 'Sarabun', Arial, sans-serif; padding: 0; background: white; color: #333; width: 750px; min-height: 1050px; display: flex; flex-direction: column; box-sizing: border-box;">
        ${createPDFHeader(buildingName, pageNumber, totalPages)}

        <!-- Main Content -->
        <div style="flex: 1; padding: 25px;">
          <!-- สรุปผลประกอบการ -->
          <div style="background: linear-gradient(135deg, #5B9BD5 0%, #4a86c7 100%); color: white; padding: 15px 20px; border-radius: 10px 10px 0 0; font-size: 16px;">
            <strong>📊 สรุปผลประกอบการ</strong>
          </div>
          <div style="border: 2px solid #5B9BD530; border-top: none; border-radius: 0 0 10px 10px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tbody>
                <tr style="background: #84A59D10;">
                  <td style="padding: 18px 20px; border-bottom: 1px solid #eee; width: 60%;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 20px;">📈</span>
                      <span style="font-weight: 600;">รวมรายได้</span>
                    </div>
                  </td>
                  <td style="padding: 18px 20px; text-align: right; font-weight: bold; color: #5a7d75; font-size: 18px; border-bottom: 1px solid #eee;">${formatNumber(data.totalIncome)}</td>
                </tr>
                <tr style="background: #F2848210;">
                  <td style="padding: 18px 20px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 20px;">📉</span>
                      <span style="font-weight: 600;">รวมค่าใช้จ่าย</span>
                    </div>
                  </td>
                  <td style="padding: 18px 20px; text-align: right; font-weight: bold; color: #d96f6d; font-size: 18px; border-bottom: 1px solid #eee;">${formatNumber(data.totalExpense)}</td>
                </tr>
                <tr style="background: #5B9BD510;">
                  <td style="padding: 18px 20px; border-bottom: 2px solid #ddd;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 20px;">💰</span>
                      <div>
                        <span style="font-weight: 600;">Gross Profit</span>
                        <div style="font-size: 11px; color: #888; margin-top: 2px;">= รวมรายได้ - รวมค่าใช้จ่าย</div>
                      </div>
                    </div>
                  </td>
                  <td style="padding: 18px 20px; text-align: right; font-weight: bold; color: #4a86c7; font-size: 18px; border-bottom: 2px solid #ddd;">${formatNumber(data.grossProfit)}</td>
                </tr>
                <tr style="background: linear-gradient(to right, #F6BD6040, #F6BD6060);">
                  <td style="padding: 25px 20px; border-bottom: 3px solid #D4A24C;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 24px;">⭐</span>
                      <div>
                        <span style="font-weight: bold; font-size: 16px;">Net Profit (Owner)</span>
                        <div style="font-size: 11px; color: #888; margin-top: 2px;">= Gross Profit - Management Fee - VAT - Little Hotelier</div>
                      </div>
                    </div>
                  </td>
                  <td style="padding: 25px 20px; text-align: right; font-weight: bold; color: #b8893f; font-size: 26px; border-bottom: 3px solid #D4A24C;">${formatNumber(data.netProfit)}</td>
                </tr>
                <tr style="background: white;">
                  <td style="padding: 14px 20px; border-bottom: 1px solid #eee; color: #555;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 18px;">🏷️</span>
                      <div>
                        <span>Management Fee (${data.managementFeePercent}%)</span>
                        <div style="font-size: 10px; color: #999; margin-top: 2px;">= รายได้ค่าเช่า × ${data.managementFeePercent}%</div>
                      </div>
                    </div>
                  </td>
                  <td style="padding: 14px 20px; text-align: right; color: #b8893f; font-size: 15px; border-bottom: 1px solid #eee;">${formatNumber(data.managementFee)}</td>
                </tr>
                <tr style="background: #F6BD6015;">
                  <td style="padding: 14px 20px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 18px;">💵</span>
                      <div>
                        <span style="font-weight: 600;">Amount to be Paid</span>
                        <div style="font-size: 10px; color: #999; margin-top: 2px;">= Management Fee + VAT ${data.vatPercent}%</div>
                      </div>
                    </div>
                  </td>
                  <td style="padding: 14px 20px; text-align: right; font-weight: bold; color: #b8893f; font-size: 16px; border-bottom: 1px solid #eee;">${formatNumber(data.amountToBePaid)}</td>
                </tr>
                <tr style="background: white;">
                  <td style="padding: 14px 20px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 18px;">🏠</span>
                      <span>ค่าเช่าอาคาร/เดือน</span>
                    </div>
                  </td>
                  <td style="padding: 14px 20px; text-align: right; color: #d96f6d; font-size: 15px; border-bottom: 1px solid #eee;">${formatNumber(data.monthlyRent)}</td>
                </tr>
                <tr style="background: #84A59D10;">
                  <td style="padding: 14px 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 18px;">👥</span>
                      <span>เงินเดือนพนักงาน/เดือน</span>
                    </div>
                  </td>
                  <td style="padding: 14px 20px; text-align: right; color: #5a7d75; font-size: 15px;">${formatNumber(data.expenseByCategory?.['เงินเดือนพนักงาน'] || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer -->
        ${createPDFFooter(pageNumber, totalPages)}
      </div>
    `
  }

  // สร้าง HTML content สำหรับ PDF (รองรับภาษาไทย) - ปรับปรุงให้สวยงาม (ใช้สำหรับ backward compatibility)
  const createPDFContent = (data: Summary, buildingName: string, pageNumber?: number, totalPages?: number): string => {
    return createPDFPage1(data, buildingName, pageNumber, totalPages)
  }

  // Export to PDF - Single Building (ใช้ html2canvas รองรับภาษาไทย) - แยก 3 หน้า
  const handleExportPDF = async (data: Summary, buildingName: string) => {
    setExportingPDF(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = 210
      const margin = 10
      const contentWidth = pdfWidth - (margin * 2)
      const totalPages = 3

      // สร้าง temporary container
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      document.body.appendChild(tempContainer)

      // ฟังก์ชัน capture และเพิ่มเข้า PDF
      const addPageFromHTML = async (htmlContent: string, isFirstPage: boolean) => {
        tempContainer.innerHTML = htmlContent
        await new Promise(resolve => setTimeout(resolve, 150))

        const canvas = await html2canvas(tempContainer.firstElementChild as HTMLElement, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        })

        const imgData = canvas.toDataURL('image/png')
        const imgHeight = (canvas.height * contentWidth) / canvas.width

        if (!isFirstPage) {
          pdf.addPage()
        }

        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight)
      }

      // หน้า 1: ตารางรายรับ/รายจ่าย
      await addPageFromHTML(createPDFPage1(data, buildingName, 1, totalPages), true)

      // หน้า 2: สรุปผลประกอบการ
      await addPageFromHTML(createPDFPage2(data, buildingName, 2, totalPages), false)

      // หน้า 3: กราฟแท่ง
      await addPageFromHTML(createPDFPage3(data, buildingName, 3, totalPages), false)

      // ลบ temp container
      document.body.removeChild(tempContainer)

      const fileName = `ASW_Report_${buildingName.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error('Error exporting PDF:', err)
      alert('เกิดข้อผิดพลาดในการส่งออก PDF')
    } finally {
      setExportingPDF(false)
    }
  }

  // สร้างกราฟแท่งเปรียบเทียบอาคาร
  const createBuildingsCompareChart = (buildingsData: Summary[]): string => {
    const maxVal = Math.max(...buildingsData.map(b => Math.max(b.totalIncome, b.totalExpense, Math.abs(b.netProfit)))) || 1

    return `
      <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <div style="font-weight: bold; margin-bottom: 15px; color: #333; font-size: 12px;">📊 กราฟเปรียบเทียบอาคาร</div>
        ${buildingsData.map(b => {
          const incomePercent = (b.totalIncome / maxVal) * 100
          const expensePercent = (b.totalExpense / maxVal) * 100
          const profitPercent = (Math.abs(b.netProfit) / maxVal) * 100
          return `
          <div style="margin-bottom: 12px;">
            <div style="font-weight: bold; margin-bottom: 6px; color: #333; font-size: 10px;">${b.buildingCode || b.buildingName}</div>
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 3px;">
              <div style="width: 45px; font-size: 9px; color: #5a7d75;">รายรับ</div>
              <div style="flex: 1; background: #e0e0e0; border-radius: 3px; height: 12px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #84A59D, #5a7d75); width: ${incomePercent}%; height: 100%; border-radius: 3px;"></div>
              </div>
              <div style="width: 70px; text-align: right; font-size: 9px; color: #5a7d75;">${formatNumber(b.totalIncome)}</div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 3px;">
              <div style="width: 45px; font-size: 9px; color: #d96f6d;">รายจ่าย</div>
              <div style="flex: 1; background: #e0e0e0; border-radius: 3px; height: 12px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #F28482, #d96f6d); width: ${expensePercent}%; height: 100%; border-radius: 3px;"></div>
              </div>
              <div style="width: 70px; text-align: right; font-size: 9px; color: #d96f6d;">${formatNumber(b.totalExpense)}</div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <div style="width: 45px; font-size: 9px; color: ${b.netProfit >= 0 ? '#b8893f' : '#d96f6d'};">กำไร</div>
              <div style="flex: 1; background: #e0e0e0; border-radius: 3px; height: 12px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, ${b.netProfit >= 0 ? '#F6BD60, #b8893f' : '#F28482, #d96f6d'}); width: ${profitPercent}%; height: 100%; border-radius: 3px;"></div>
              </div>
              <div style="width: 70px; text-align: right; font-size: 9px; font-weight: bold; color: ${b.netProfit >= 0 ? '#b8893f' : '#d96f6d'};">${formatNumber(b.netProfit)}</div>
            </div>
          </div>
        `}).join('')}
      </div>
    `
  }

  // สร้าง HTML content สำหรับสรุปรวมทุกอาคาร - ปรับปรุงให้สวยงาม
  const createTotalSummaryContent = (total: Summary, buildingsData: Summary[], pageNumber: number, totalPages: number): string => {
    const monthYear = `${getMonthName(parseInt(selectedMonth))} ${selectedYear}`

    return `
      <div style="font-family: 'Sarabun', Arial, sans-serif; padding: 0; background: white; color: #333; width: 750px; min-height: 1050px; display: flex; flex-direction: column; box-sizing: border-box;">
        <!-- Header with Logo -->
        <div style="background: linear-gradient(135deg, #84A59D 0%, #6b8a84 100%); padding: 15px 25px; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 40px; height: 40px; background: #F6BD60; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 16px; font-weight: bold; color: #84A59D;">ASW</span>
              </div>
              <div>
                <h1 style="margin: 0; font-size: 16px; font-weight: bold;">ARUN SA WAD</h1>
                <p style="margin: 0; font-size: 10px; opacity: 0.9;">Monthly Financial Report</p>
              </div>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 11px; opacity: 0.9;">รายงานประจำเดือน</p>
              <p style="margin: 0; font-size: 14px; font-weight: bold;">${monthYear}</p>
            </div>
          </div>
        </div>

        <!-- Title Bar -->
        <div style="background: linear-gradient(135deg, #F6BD60 0%, #e5a84f 100%); padding: 10px 25px;">
          <h2 style="margin: 0; font-size: 14px; color: #333; font-weight: bold;">📋 สรุปรวมทุกอาคาร</h2>
        </div>

        <!-- Main Content -->
        <div style="flex: 1; padding: 15px 25px;">
          <!-- กราฟเปรียบเทียบอาคาร -->
          ${createBuildingsCompareChart(buildingsData)}

          <!-- ตารางเปรียบเทียบอาคาร -->
          <div style="margin-bottom: 25px;">
            <div style="background: linear-gradient(135deg, #84A59D 0%, #6b8a84 100%); color: white; padding: 12px 15px; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">🏢</span>
              <strong>เปรียบเทียบแต่ละอาคาร</strong>
            </div>
            <div style="border: 1px solid #84A59D30; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #84A59D15;">
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">อาคาร</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">รายได้</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">รายจ่าย</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Gross Profit</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildingsData.map((b, i) => `
                    <tr style="background: ${i % 2 === 0 ? 'white' : '#f9fafb'};">
                      <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: 500;">🏠 ${b.buildingName}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; color: #5a7d75;">${formatNumber(b.totalIncome)}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; color: #d96f6d;">${formatNumber(b.totalExpense)}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; color: #4a86c7;">${formatNumber(b.grossProfit)}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold; color: #b8893f;">${formatNumber(b.netProfit)}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="background: linear-gradient(to right, #F6BD6030, #F6BD6050);">
                    <td style="padding: 12px; font-weight: bold;">รวมทั้งหมด</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #5a7d75;">${formatNumber(total.totalIncome)}</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #d96f6d;">${formatNumber(total.totalExpense)}</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #4a86c7;">${formatNumber(total.grossProfit)}</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #b8893f; font-size: 14px;">${formatNumber(total.netProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- สรุปผลประกอบการรวม -->
          <div>
            <div style="background: linear-gradient(135deg, #5B9BD5 0%, #4a86c7 100%); color: white; padding: 12px 15px; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">📊</span>
              <strong>สรุปผลประกอบการรวม</strong>
            </div>
            <div style="border: 1px solid #5B9BD530; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tbody>
                  <tr style="background: #84A59D10;">
                    <td style="padding: 14px 15px; border-bottom: 1px solid #eee;">📈 รวมรายได้ทุกอาคาร</td>
                    <td style="padding: 14px 15px; text-align: right; font-weight: bold; color: #5a7d75; font-size: 15px; border-bottom: 1px solid #eee;">${formatNumber(total.totalIncome)}</td>
                  </tr>
                  <tr style="background: #F2848210;">
                    <td style="padding: 14px 15px; border-bottom: 1px solid #eee;">📉 รวมค่าใช้จ่ายทุกอาคาร</td>
                    <td style="padding: 14px 15px; text-align: right; font-weight: bold; color: #d96f6d; font-size: 15px; border-bottom: 1px solid #eee;">${formatNumber(total.totalExpense)}</td>
                  </tr>
                  <tr style="background: #5B9BD510;">
                    <td style="padding: 14px 15px; border-bottom: 1px solid #ddd;">
                      <div>💰 Gross Profit รวม</div>
                      <div style="font-size: 9px; color: #999; font-weight: normal;">= รวมรายได้ - รวมค่าใช้จ่าย</div>
                    </td>
                    <td style="padding: 14px 15px; text-align: right; font-weight: bold; color: #4a86c7; font-size: 15px; border-bottom: 1px solid #ddd;">${formatNumber(total.grossProfit)}</td>
                  </tr>
                  <tr style="background: linear-gradient(to right, #F6BD6030, #F6BD6050);">
                    <td style="padding: 16px 15px; font-weight: bold; border-bottom: 2px solid #E8DED5; font-size: 14px;">
                      <div>⭐ Net Profit (Owner) รวม</div>
                      <div style="font-size: 9px; color: #999; font-weight: normal;">= Gross Profit - Management Fee - VAT - Little Hotelier</div>
                    </td>
                    <td style="padding: 16px 15px; text-align: right; font-weight: bold; color: #b8893f; font-size: 20px; border-bottom: 2px solid #E8DED5;">${formatNumber(total.netProfit)}</td>
                  </tr>
                  <tr style="background: white;">
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee; color: #666;">
                      <div>🏷️ Management Fee รวม</div>
                      <div style="font-size: 9px; color: #999; font-weight: normal;">= รายได้ค่าเช่า × 13.5%</div>
                    </td>
                    <td style="padding: 12px 15px; text-align: right; color: #b8893f; border-bottom: 1px solid #eee;">${formatNumber(total.managementFee)}</td>
                  </tr>
                  <tr style="background: #F6BD6010;">
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">
                      <div>💵 Amount to be Paid รวม (รวม VAT)</div>
                      <div style="font-size: 9px; color: #999; font-weight: normal;">= Management Fee + VAT 7%</div>
                    </td>
                    <td style="padding: 12px 15px; text-align: right; font-weight: bold; color: #b8893f; border-bottom: 1px solid #eee;">${formatNumber(total.amountToBePaid)}</td>
                  </tr>
                  <tr style="background: white;">
                    <td style="padding: 12px 15px;">🏠 ค่าเช่าอาคาร/เดือน รวม</td>
                    <td style="padding: 12px 15px; text-align: right; color: #d96f6d;">${formatNumber(total.monthlyRent)}</td>
                  </tr>
                  <tr style="background: #84A59D10;">
                    <td style="padding: 12px 15px;">👥 เงินเดือนพนักงาน/เดือน รวม</td>
                    <td style="padding: 12px 15px; text-align: right; color: #5a7d75;">${formatNumber(buildingsData.reduce((sum, b) => sum + (b.expenseByCategory?.['เงินเดือนพนักงาน'] || 0), 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; border-top: 1px solid #e5e5e5; padding: 12px 30px; display: flex; justify-content: space-between; align-items: center;">
          <div style="color: #999; font-size: 10px;">
            <p style="margin: 0;">พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</p>
          </div>
          <div style="color: #666; font-size: 11px; font-weight: 500;">
            หน้า ${pageNumber} / ${totalPages}
          </div>
          <div style="color: #999; font-size: 10px;">
            <p style="margin: 0;">ARUN SA WAD Monthly Report System</p>
          </div>
        </div>
      </div>
    `
  }

  // Export All Buildings to PDF (ใช้ html2canvas รองรับภาษาไทย) - ปรับปรุงการแยกหน้า (3 หน้าต่ออาคาร)
  const handleExportAllPDF = async () => {
    if (!allSummaryData) return

    setExportingPDF(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = 210
      const margin = 10
      const contentWidth = pdfWidth - (margin * 2)

      // คำนวณจำนวนหน้าทั้งหมด (อาคาร × 3 + หน้าสรุป)
      const totalPages = (allSummaryData.buildings.length * 3) + 1

      // สร้าง temp container สำหรับ render
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      document.body.appendChild(tempContainer)

      // ฟังก์ชัน capture และเพิ่มเข้า PDF
      const addPageFromHTML = async (htmlContent: string, isFirstPage: boolean) => {
        tempContainer.innerHTML = htmlContent

        await new Promise(resolve => setTimeout(resolve, 150))

        const canvas = await html2canvas(tempContainer.firstElementChild as HTMLElement, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        })

        const imgData = canvas.toDataURL('image/png')
        const imgHeight = (canvas.height * contentWidth) / canvas.width

        if (!isFirstPage) {
          pdf.addPage()
        }

        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, imgHeight)
      }

      // สร้าง PDF สำหรับแต่ละอาคาร (3 หน้าต่ออาคาร)
      for (let i = 0; i < allSummaryData.buildings.length; i++) {
        const building = allSummaryData.buildings[i]
        const page1Number = (i * 3) + 1
        const page2Number = (i * 3) + 2
        const page3Number = (i * 3) + 3

        // หน้า 1: ตารางรายรับ/รายจ่าย
        await addPageFromHTML(createPDFPage1(building, building.buildingName, page1Number, totalPages), i === 0)

        // หน้า 2: สรุปผลประกอบการ
        await addPageFromHTML(createPDFPage2(building, building.buildingName, page2Number, totalPages), false)

        // หน้า 3: กราฟแท่ง
        await addPageFromHTML(createPDFPage3(building, building.buildingName, page3Number, totalPages), false)
      }

      // สรุปรวมทุกอาคาร (หน้าสุดท้าย)
      const totalContent = createTotalSummaryContent(
        allSummaryData.total,
        allSummaryData.buildings,
        totalPages,
        totalPages
      )
      await addPageFromHTML(totalContent, false)

      // ลบ temp container
      document.body.removeChild(tempContainer)

      const fileName = `ASW_Report_AllBuildings_${selectedMonth}_${selectedYear}.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error('Error exporting PDF:', err)
      alert('เกิดข้อผิดพลาดในการส่งออก PDF')
    } finally {
      setExportingPDF(false)
    }
  }

  // Print - เปิดหน้าต่างพิมพ์ที่แสดงเหมือน PDF
  const handlePrint = async (data: Summary, buildingName: string) => {
    // สร้าง HTML content เหมือน PDF
    const page1 = createPDFPage1(data, buildingName)
    const page2 = createPDFPage2(data, buildingName)
    const page3 = createPDFPage3(data, buildingName)

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>รายงาน ${buildingName} - ${getMonthName(parseInt(selectedMonth))} ${selectedYear}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { margin: 0; padding: 0; font-family: 'Sarabun', Arial, sans-serif; }
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        <div class="page">${page1}</div>
        <div class="page">${page2}</div>
        <div class="page">${page3}</div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  // Print All Buildings
  const handlePrintAll = async () => {
    if (!allSummaryData) return

    // สร้าง HTML content สำหรับทุกอาคาร
    let allPages = ''
    for (const building of allSummaryData.buildings) {
      allPages += `<div class="page">${createPDFPage1(building, building.buildingName)}</div>`
      allPages += `<div class="page">${createPDFPage2(building, building.buildingName)}</div>`
      allPages += `<div class="page">${createPDFPage3(building, building.buildingName)}</div>`
    }
    // เพิ่มหน้าสรุปรวม
    allPages += `<div class="page">${createTotalSummaryContent(allSummaryData.total, allSummaryData.buildings, allSummaryData.buildings.length * 3 + 1, allSummaryData.buildings.length * 3 + 1)}</div>`

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>รายงานทุกอาคาร - ${getMonthName(parseInt(selectedMonth))} ${selectedYear}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { margin: 0; padding: 0; font-family: 'Sarabun', Arial, sans-serif; }
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        ${allPages}
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  // Render Income/Expense Detail Tables
  const renderDetailTables = (data: Summary) => {
    const incomeEntries = Object.entries(data.incomeByChannel || {}).filter(([, v]) => v > 0)
    const expenseEntries = Object.entries(data.expenseByCategory || {}).filter(([, v]) => v > 0)

    // แยกรายได้เป็น 2 กลุ่ม: ค่าเช่า และ รายได้อื่นๆ
    const rentalIncomeEntries = incomeEntries.filter(([name]) => name.includes('ค่าเช่า'))
    const otherIncomeEntries = incomeEntries.filter(([name]) => !name.includes('ค่าเช่า'))
    const totalRentalIncome = rentalIncomeEntries.reduce((sum, [, v]) => sum + v, 0)
    const totalOtherIncome = otherIncomeEntries.reduce((sum, [, v]) => sum + v, 0)

    // แยกรายจ่าย: ค่าเช่าอาคาร, เงินเดือนพนักงาน, และอื่นๆ
    const rentEntry = expenseEntries.find(([name]) => name === 'ค่าเช่าอาคาร')
    const salaryEntry = expenseEntries.find(([name]) => name === 'เงินเดือนพนักงาน')
    const otherExpenseEntries = expenseEntries.filter(([name]) => name !== 'ค่าเช่าอาคาร' && name !== 'เงินเดือนพนักงาน')

    // จัดเรียงรายจ่ายใหม่
    const sortedExpenseEntries: [string, number][] = []
    if (rentEntry) sortedExpenseEntries.push(rentEntry)
    if (salaryEntry) sortedExpenseEntries.push(salaryEntry)
    sortedExpenseEntries.push(...otherExpenseEntries)

    return (
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        {/* รายรับ */}
        {incomeEntries.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-[#84A59D]/30">
            <div className="bg-[#84A59D] px-4 py-2">
              <h4 className="font-bold text-white">รายรับ</h4>
            </div>

            {/* กลุ่ม 1: รายได้ค่าเช่า */}
            {rentalIncomeEntries.length > 0 && (
              <>
                <div className="bg-[#84A59D]/10 px-4 py-2 border-b border-[#84A59D]/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[#5a7d75]">รายได้ค่าเช่า</span>
                    <span className="text-sm font-bold text-[#5a7d75]">{formatNumber(totalRentalIncome)}</span>
                  </div>
                </div>
                <table className="w-full">
                  <tbody>
                    {rentalIncomeEntries.map(([name, value], index) => (
                      <tr key={name} className={index % 2 === 0 ? 'bg-white' : 'bg-[#84A59D]/5'}>
                        <td className="px-4 py-2 text-sm w-[40px]">{index + 1}</td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CategoryIcon name={name} className="h-4 w-4 flex-shrink-0" />
                            <span>{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-sm">{formatNumber(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* กลุ่ม 2: รายได้อื่นๆ */}
            {otherIncomeEntries.length > 0 && (
              <>
                <div className="bg-[#F6BD60]/10 px-4 py-2 border-y border-[#F6BD60]/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[#D4A24C]">รายได้อื่นๆ</span>
                    <span className="text-sm font-bold text-[#D4A24C]">{formatNumber(totalOtherIncome)}</span>
                  </div>
                </div>
                <table className="w-full">
                  <tbody>
                    {otherIncomeEntries.map(([name, value], index) => (
                      <tr key={name} className={index % 2 === 0 ? 'bg-white' : 'bg-[#F6BD60]/5'}>
                        <td className="px-4 py-2 text-sm w-[40px]">{index + 1}</td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CategoryIcon name={name} className="h-4 w-4 flex-shrink-0" />
                            <span>{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right text-sm">{formatNumber(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Footer รวมรายได้ */}
            <div className="bg-[#84A59D]/20 px-4 py-2">
              <div className="flex justify-between">
                <span className="font-bold text-[#84A59D]">รวมรายได้</span>
                <span className="font-bold text-[#84A59D]">{formatNumber(data.totalIncome)}</span>
              </div>
            </div>
          </div>
        )}

        {/* รายจ่าย */}
        {sortedExpenseEntries.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-[#F28482]/30">
            <div className="bg-[#F28482] px-4 py-2">
              <h4 className="font-bold text-white">รายจ่าย</h4>
            </div>
            <table className="w-full">
              <tbody>
                {sortedExpenseEntries.map(([name, value], index) => {
                  const isRent = name === 'ค่าเช่าอาคาร'
                  const isSalary = name === 'เงินเดือนพนักงาน'
                  const bgClass = isRent ? 'bg-[#F6BD60]/10' : isSalary ? 'bg-[#84A59D]/10' : (index % 2 === 0 ? 'bg-white' : 'bg-[#F28482]/5')
                  const textClass = isRent ? 'text-[#D4A24C] font-medium' : isSalary ? 'text-[#84A59D] font-medium' : ''

                  return (
                    <tr key={name} className={bgClass}>
                      <td className="px-4 py-2 text-sm w-[40px]">{index + 1}</td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CategoryIcon name={name} className="h-4 w-4 flex-shrink-0" />
                          <span className={textClass}>{name}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-right text-sm ${textClass}`}>{formatNumber(value)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {/* Footer รวมค่าใช้จ่าย */}
            <div className="bg-[#F28482]/20 px-4 py-2">
              <div className="flex justify-between">
                <span className="font-bold text-[#F28482]">รวมค่าใช้จ่าย</span>
                <span className="font-bold text-[#F28482]">{formatNumber(data.totalExpense)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render Summary Table
  const renderSummaryTable = (data: Summary, showTitle: boolean = true, buildingIndex: number = 0) => (
    <div className="space-y-4">
      {showTitle && (
        <div
          className="px-4 py-2 text-white print:bg-gray-700 rounded-t-lg"
          style={{ backgroundColor: data.buildingId ? getBuildingColor(data.buildingId) : getBuildingColorByIndex(buildingIndex) }}
        >
          <h3 className="font-bold">{data.buildingName}</h3>
        </div>
      )}

      {/* แสดงรายละเอียดรายรับ/รายจ่าย */}
      {renderDetailTables(data)}

      {/* ตารางสรุปผลประกอบการ - อ้างอิงตาม Dashboard */}
      <div className="overflow-hidden rounded-lg border border-[#E8DED5] print:border-gray-300">
        <div className="bg-[#84A59D] px-4 py-2">
          <h4 className="font-bold text-white">สรุปผลประกอบการ</h4>
        </div>
        <table className="w-full">
          <tbody>
            {/* กลุ่มที่ 1: รายได้-รายจ่าย-กำไร */}
            <tr className="bg-[#84A59D]/10 print:bg-gray-100">
              <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#84A59D]" />
                  <span>รวมรายได้</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#84A59D] print:text-gray-800">
                {formatNumber(data.totalIncome)}
              </td>
            </tr>
            <tr className="bg-[#F28482]/10 print:bg-gray-50">
              <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-[#F28482]" />
                  <span>รวมค่าใช้จ่าย</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#F28482] print:text-gray-800">
                {formatNumber(data.totalExpense)}
              </td>
            </tr>
            <tr className="bg-[#5B9BD5]/10 print:bg-gray-100">
              <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-[#5B9BD5]" />
                  <div>
                    <span>Gross Profit</span>
                    <p className="text-[10px] text-slate-400 font-normal">= รวมรายได้ - รวมค่าใช้จ่าย</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#5B9BD5] print:text-gray-800">
                {formatNumber(data.grossProfit)}
              </td>
            </tr>
            <tr className="bg-[#F6BD60]/20 print:bg-gray-200">
              <td className="px-4 py-3 font-bold">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#D4A24C]" />
                  <div>
                    <span>Net Profit (Owner)</span>
                    <p className="text-[10px] text-slate-400 font-normal">= Gross Profit - Management Fee - VAT - Little Hotelier</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-bold text-[#D4A24C] print:text-gray-800">
                {formatNumber(data.netProfit)}
              </td>
            </tr>

            {/* เส้นคั่น */}
            <tr>
              <td colSpan={2} className="border-t-2 border-[#E8DED5]"></td>
            </tr>

            {/* กลุ่มที่ 2: รายละเอียดเพิ่มเติม */}
            <tr className="bg-white">
              <td className="px-4 py-2 font-medium">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-[#D4A24C]" />
                  <div>
                    <span>Management Fee ({data.managementFeePercent}%)</span>
                    <p className="text-[10px] text-slate-400 font-normal">= รายได้ค่าเช่า × {data.managementFeePercent}%</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-2 text-right text-[#D4A24C]">
                {formatNumber(data.managementFee)}
              </td>
            </tr>
            <tr className="bg-[#F6BD60]/5">
              <td className="px-4 py-2 font-medium">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#D4A24C]" />
                  <div>
                    <span>Amount to be Paid (รวม VAT {data.vatPercent}%)</span>
                    <p className="text-[10px] text-slate-400 font-normal">= Management Fee + VAT {data.vatPercent}%</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-2 text-right font-bold text-[#D4A24C]">
                {formatNumber(data.amountToBePaid)}
              </td>
            </tr>
            <tr className="bg-white">
              <td className="px-4 py-2 font-medium">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#F28482]" />
                  <span>ค่าเช่าอาคาร/เดือน</span>
                </div>
              </td>
              <td className="px-4 py-2 text-right text-[#d96f6d]">
                {formatNumber(data.monthlyRent)}
              </td>
            </tr>
            <tr className="bg-[#84A59D]/5">
              <td className="px-4 py-2 font-medium">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#84A59D]" />
                  <span>เงินเดือนพนักงาน/เดือน</span>
                </div>
              </td>
              <td className="px-4 py-2 text-right text-[#84A59D]">
                {formatNumber(data.expenseByCategory?.['เงินเดือนพนักงาน'] || 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header - ซ่อนตอนพิมพ์ */}
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-[#333]">ดาวน์โหลดรายงาน</h1>
        <p className="text-[#666]">
          ส่งออกรายงานรายรับ-รายจ่าย
        </p>
      </div>

      {/* Filters - ซ่อนตอนพิมพ์ */}
      <Card className="border-0 shadow-md print:hidden">
        <CardHeader className="bg-[#84A59D] text-white rounded-t-xl">
          <CardTitle>เลือกช่วงเวลา</CardTitle>
          <CardDescription className="text-white/80">
            กำหนดอาคารและช่วงเวลาที่ต้องการดาวน์โหลด
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#333]">อาคาร</label>
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="w-[280px] bg-white">
                  <SelectValue placeholder="เลือกอาคาร" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      ทุกอาคาร (แยกแต่ละอาคาร)
                    </span>
                  </SelectItem>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getBuildingColor(b.id) }}
                        />
                        {b.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#333]">เดือน</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px] bg-white">
                  <SelectValue placeholder="เดือน" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#333]">ปี</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px] bg-white">
                  <SelectValue placeholder="ปี" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex h-32 items-center justify-center print:hidden">
          <Loader2 className="h-8 w-8 animate-spin text-[#84A59D]" />
        </div>
      ) : selectedBuilding === 'all' && allSummaryData ? (
        // แสดงทุกอาคาร
        <div className="space-y-6">
          {/* แต่ละอาคาร */}
          {allSummaryData.buildings.map((building, index) => (
            <Card key={building.buildingId} className="border-0 shadow-md print:shadow-none print:border print:border-gray-300">
              <CardContent className="p-0">
                {renderSummaryTable(building, true, index)}

                {/* ปุ่มดาวน์โหลดแยกอาคาร - ซ่อนตอนพิมพ์ */}
                <div className="flex justify-end gap-2 p-4 print:hidden">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportPDF(building, building.buildingName)}
                    disabled={exportingPDF}
                    className="border-[#F28482] text-[#F28482] hover:bg-[#F28482]/10"
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* สรุปรวม */}
          <Card className="border-0 shadow-md bg-[#84A59D]/10 print:shadow-none print:border print:border-gray-300">
            <CardHeader>
              <CardTitle>สรุปรวมทุกอาคาร</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSummaryTable(allSummaryData.total, false)}
            </CardContent>
          </Card>

          {/* ปุ่มดาวน์โหลดทั้งหมด - ซ่อนตอนพิมพ์ */}
          <div className="flex flex-wrap justify-end gap-3 print:hidden">
            <Button
              onClick={handlePrintAll}
              variant="outline"
              className="border-gray-400 text-gray-600 hover:bg-gray-100"
            >
              <Printer className="mr-2 h-4 w-4" />
              พิมพ์
            </Button>
            <Button
              onClick={handleExportAllPDF}
              disabled={exportingPDF}
              variant="outline"
              className="border-[#F28482] text-[#F28482] hover:bg-[#F28482]/10"
            >
              {exportingPDF ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              ดาวน์โหลด PDF
            </Button>
          </div>
        </div>
      ) : summaryData ? (
        // แสดงอาคารเดียว
        <Card className="border-0 shadow-md print:shadow-none print:border print:border-gray-300">
          <CardHeader className="print:hidden">
            <CardTitle>
              รายงาน: {selectedBuildingName}
            </CardTitle>
            <CardDescription>
              {getMonthName(parseInt(selectedMonth))} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderSummaryTable(summaryData, false)}

            {/* ปุ่มดาวน์โหลด - ซ่อนตอนพิมพ์ */}
            <div className="flex flex-wrap justify-end gap-3 pt-4 print:hidden">
              <Button
                onClick={() => handlePrint(summaryData, selectedBuildingName)}
                variant="outline"
                className="border-gray-400 text-gray-600 hover:bg-gray-100"
              >
                <Printer className="mr-2 h-4 w-4" />
                พิมพ์
              </Button>
              <Button
                onClick={() => handleExportPDF(summaryData, selectedBuildingName)}
                disabled={exportingPDF}
                variant="outline"
                className="border-[#F28482] text-[#F28482] hover:bg-[#F28482]/10"
              >
                {exportingPDF ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                ดาวน์โหลด PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md print:hidden">
          <CardContent className="py-12 text-center">
            <FileDown className="mx-auto h-12 w-12 text-[#84A59D]/50" />
            <p className="mt-4 text-[#666]">ไม่พบข้อมูลสำหรับช่วงเวลาที่เลือก</p>
          </CardContent>
        </Card>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 12px;
            line-height: 1.4;
          }

          /* ซ่อน elements ที่ไม่ต้องการพิมพ์ */
          .print\\:hidden,
          nav,
          aside,
          header,
          footer,
          button {
            display: none !important;
          }

          .print\\:block {
            display: block !important;
          }

          /* Card styles */
          .border-0 {
            border: 1px solid #e5e5e5 !important;
          }

          /* ตารางรายรับ */
          .bg-\\[\\#84A59D\\] {
            background-color: #84A59D !important;
            color: white !important;
          }

          /* ตารางรายจ่าย */
          .bg-\\[\\#F28482\\] {
            background-color: #F28482 !important;
            color: white !important;
          }

          /* สีพื้นหลังแถว */
          .bg-\\[\\#84A59D\\]\\/5,
          .bg-\\[\\#84A59D\\]\\/10 {
            background-color: #f0f5f4 !important;
          }

          .bg-\\[\\#F28482\\]\\/5,
          .bg-\\[\\#F28482\\]\\/10 {
            background-color: #fef5f5 !important;
          }

          .bg-\\[\\#5B9BD5\\]\\/10 {
            background-color: #f0f6fc !important;
          }

          .bg-\\[\\#F6BD60\\]\\/20,
          .bg-\\[\\#F6BD60\\]\\/5 {
            background-color: #fef9ed !important;
          }

          /* Text colors for print */
          .text-\\[\\#84A59D\\] {
            color: #5a7d75 !important;
          }

          .text-\\[\\#F28482\\] {
            color: #d96f6d !important;
          }

          .text-\\[\\#5B9BD5\\] {
            color: #4a86c7 !important;
          }

          .text-\\[\\#D4A24C\\] {
            color: #b8893f !important;
          }

          /* Page settings */
          @page {
            margin: 1.5cm;
            size: A4;
          }

          /* Page breaks */
          .page-break {
            page-break-before: always;
          }

          /* Tables */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          td, th {
            padding: 8px !important;
            border-bottom: 1px solid #e5e5e5 !important;
          }

          /* Headers */
          h1, h2, h3, h4 {
            page-break-after: avoid;
          }

          /* Spacing */
          .space-y-4 > * + * {
            margin-top: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}
