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
  cowayWaterFilterExpense: number
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

interface GlobalSettings {
  id: number
  buildingCount: number
  careExpenseDivisor: number
  maxCareExpense: number
  trafficCareExpense: number
  shippingExpense: number
  amenityExpense: number
  waterBottleExpense: number
  cookieExpense: number
  coffeeExpense: number
  fuelExpense: number
  parkingExpense: number
  motorcycleMaintenanceExpense: number
  maidTravelExpense: number
  cleaningSupplyExpense: number
  laundryDetergentExpense: number
  maxCareExpensePerBuilding: number
  trafficCareExpensePerBuilding: number
  shippingExpensePerBuilding: number
  amenityExpensePerBuilding: number
  waterBottleExpensePerBuilding: number
  cookieExpensePerBuilding: number
  coffeeExpensePerBuilding: number
  fuelExpensePerBuilding: number
  parkingExpensePerBuilding: number
  motorcycleMaintenanceExpensePerBuilding: number
  maidTravelExpensePerBuilding: number
  cleaningSupplyExpensePerBuilding: number
  laundryDetergentExpensePerBuilding: number
}

interface Category {
  id: number
  name: string
  type: 'INCOME' | 'EXPENSE'
  order: number
}

export default function ReportsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  )
  const [summaryData, setSummaryData] = useState<Summary | null>(null)
  const [allSummaryData, setAllSummaryData] = useState<AllSummaryData | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)

  const years = generateYears()

  // โหลดรายการอาคาร, หมวดหมู่ และ GlobalSettings
  useEffect(() => {
    Promise.all([
      fetch('/api/buildings').then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
      fetch('/api/global-settings').then((res) => res.json()),
    ])
      .then(([buildingsData, categoriesData, globalData]) => {
        setBuildings(buildingsData)
        setCategories(categoriesData)
        setGlobalSettings(globalData)
      })
      .catch((err) => console.error('Error loading data:', err))
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
    if (lowerName.includes('กรองน้ำ') || lowerName.includes('coway')) return '🚰'
    if (lowerName.includes('อุปกรณ์ทำความสะอาด') || lowerName.includes('ทำความสะอาด')) return '🧹'
    if (lowerName.includes('น้ำยาซักผ้า') || lowerName.includes('ซักผ้า')) return '🧺'

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

  // ==================== PDF Design ใหม่ - Modern Corporate ====================

  // หน้า 1: Summary Cards + กราฟ (Modern Design)
  const createModernSummaryPage = (data: Summary, buildingName: string, pageNumber: number, totalPages: number): string => {
    const monthYear = `${getMonthName(parseInt(selectedMonth))} ${selectedYear}`
    const salary = data.expenseByCategory?.['เงินเดือนพนักงาน'] || 0

    // คำนวณ % กำไร
    const profitPercent = data.totalIncome > 0 ? ((data.netProfit / data.totalIncome) * 100).toFixed(1) : '0'

    // สร้าง Summary Cards
    const cards = [
      { label: 'รวมรายได้', value: data.totalIncome, icon: '📈', color: '#84A59D', bgColor: '#84A59D15' },
      { label: 'รวมค่าใช้จ่าย', value: data.totalExpense, icon: '📉', color: '#F28482', bgColor: '#F2848215' },
      { label: 'Gross Profit', value: data.grossProfit, icon: '💰', color: '#5B9BD5', bgColor: '#5B9BD515' },
      { label: 'Net Profit', value: data.netProfit, icon: '⭐', color: data.netProfit >= 0 ? '#F6BD60' : '#F28482', bgColor: data.netProfit >= 0 ? '#F6BD6020' : '#F2848220' },
      { label: `Management Fee (${data.managementFeePercent}%)`, value: data.managementFee, icon: '🏷️', color: '#b8893f', bgColor: '#F6BD6010' },
      { label: `Amount to be Paid (รวม VAT ${data.vatPercent}%)`, value: data.amountToBePaid, icon: '💵', color: '#b8893f', bgColor: '#F6BD6015' },
      { label: 'ค่าเช่าอาคาร/เดือน', value: data.monthlyRent, icon: '🏠', color: '#d96f6d', bgColor: '#F2848210' },
      { label: 'เงินเดือนพนักงาน', value: salary, icon: '👥', color: '#5a7d75', bgColor: '#84A59D10' },
    ]

    // สร้าง bar chart
    const maxVal = Math.max(data.totalIncome, data.totalExpense, Math.abs(data.netProfit)) || 1
    const incomePercent = (data.totalIncome / maxVal) * 100
    const expensePercent = (data.totalExpense / maxVal) * 100
    const netProfitPercent = (Math.abs(data.netProfit) / maxVal) * 100

    return `
      <div style="font-family: 'Sarabun', Arial, sans-serif; padding: 0; background: white; color: #333; width: 750px; min-height: 1050px; display: flex; flex-direction: column; box-sizing: border-box;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #84A59D 0%, #6b8a84 100%); padding: 20px 30px; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="width: 50px; height: 50px; background: #F6BD60; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                <span style="font-size: 18px; font-weight: bold; color: #84A59D;">ASW</span>
              </div>
              <div>
                <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">ARUN SA WAD</h1>
                <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Monthly Financial Report</p>
              </div>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 12px; opacity: 0.8;">รายงานประจำเดือน</p>
              <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold;">${monthYear}</p>
            </div>
          </div>
        </div>

        <!-- Building Title Bar -->
        <div style="background: linear-gradient(90deg, #F6BD60 0%, #e5a84f 100%); padding: 12px 30px;">
          <h2 style="margin: 0; font-size: 16px; color: #333; font-weight: bold;">📍 ${buildingName}</h2>
        </div>

        <!-- Main Content -->
        <div style="flex: 1; padding: 25px 30px;">
          <!-- Section Title -->
          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 16px; color: #333; font-weight: bold; display: flex; align-items: center; gap: 8px;">
              <span style="background: #84A59D; color: white; width: 28px; height: 28px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px;">📊</span>
              สรุปผลประกอบการ
            </h3>
          </div>

          <!-- Summary Cards Grid - 2 rows x 4 cols -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 30px;">
            ${cards.map((card, i) => `
              <div style="background: ${card.bgColor}; border: 1px solid ${card.color}30; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <span style="font-size: 18px;">${card.icon}</span>
                  <span style="font-size: 10px; color: #666; line-height: 1.2;">${card.label}</span>
                </div>
                <div style="font-size: ${i < 4 ? '18px' : '15px'}; font-weight: bold; color: ${card.color};">
                  ${formatNumber(card.value)}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Bar Chart Section -->
          <div style="background: #f8f9fa; border-radius: 16px; padding: 25px; border: 1px solid #e5e5e5;">
            <h4 style="margin: 0 0 20px 0; font-size: 14px; color: #333; font-weight: bold;">📊 กราฟเปรียบเทียบ รายรับ-รายจ่าย-กำไรสุทธิ</h4>

            <!-- รายรับ -->
            <div style="margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #5a7d75;">📈 รายรับ</span>
                <span style="font-size: 14px; font-weight: bold; color: #5a7d75;">${formatNumber(data.totalIncome)} บาท</span>
              </div>
              <div style="background: #e0e0e0; border-radius: 8px; height: 35px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(90deg, #84A59D, #5a7d75); width: ${incomePercent}%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: bold; font-size: 12px;">${incomePercent.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <!-- รายจ่าย -->
            <div style="margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #d96f6d;">📉 รายจ่าย</span>
                <span style="font-size: 14px; font-weight: bold; color: #d96f6d;">${formatNumber(data.totalExpense)} บาท</span>
              </div>
              <div style="background: #e0e0e0; border-radius: 8px; height: 35px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(90deg, #F28482, #d96f6d); width: ${expensePercent}%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: bold; font-size: 12px;">${expensePercent.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <!-- กำไรสุทธิ -->
            <div style="margin-bottom: 25px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: ${data.netProfit >= 0 ? '#b8893f' : '#d96f6d'};">⭐ กำไรสุทธิ (Net Profit)</span>
                <span style="font-size: 16px; font-weight: bold; color: ${data.netProfit >= 0 ? '#b8893f' : '#d96f6d'};">${formatNumber(data.netProfit)} บาท</span>
              </div>
              <div style="background: #e0e0e0; border-radius: 8px; height: 40px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(90deg, ${data.netProfit >= 0 ? '#F6BD60, #b8893f' : '#F28482, #d96f6d'}); width: ${netProfitPercent}%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: bold; font-size: 13px;">${netProfitPercent.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <!-- Profit Ratio Box -->
            <div style="background: white; border-radius: 12px; padding: 20px; text-align: center; border: 2px solid ${data.netProfit >= 0 ? '#F6BD60' : '#F28482'};">
              <div style="font-size: 12px; color: #666; margin-bottom: 8px;">อัตราส่วนกำไรสุทธิ</div>
              <div style="font-size: 36px; font-weight: bold; color: ${data.netProfit >= 0 ? '#b8893f' : '#d96f6d'};">
                ${profitPercent}%
              </div>
              <div style="font-size: 11px; color: #999; margin-top: 4px;">ของรายรับทั้งหมด</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; border-top: 1px solid #e5e5e5; padding: 12px 30px; display: flex; justify-content: space-between; align-items: center;">
          <div style="color: #999; font-size: 10px;">
            พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
          </div>
          <div style="color: #666; font-size: 11px; font-weight: 600;">
            หน้า ${pageNumber} / ${totalPages}
          </div>
          <div style="color: #999; font-size: 10px;">
            ARUN SA WAD Report
          </div>
        </div>
      </div>
    `
  }

  // หน้า 2: ตารางรายรับ/รายจ่าย (Modern Design)
  const createModernTablePage = (data: Summary, buildingName: string, pageNumber: number, totalPages: number, globalExpenseNames: string[]): string => {
    const monthYear = `${getMonthName(parseInt(selectedMonth))} ${selectedYear}`

    // ดึง categories
    const incomeCategories = categories.filter(c => c.type === 'INCOME')
    const expenseCategories = categories.filter(c => c.type === 'EXPENSE')

    // สร้าง entries
    const incomeEntries: [string, number][] = incomeCategories.map(cat => [
      cat.name,
      data.incomeByChannel?.[cat.name] || 0
    ])

    const expenseEntries: [string, number][] = expenseCategories.map(cat => [
      cat.name,
      data.expenseByCategory?.[cat.name] || 0
    ])

    // ค่าใช้จ่ายส่วนกลาง
    const pdfGlobalExpenseConfig = getPdfGlobalExpenseConfig(data.buildingCode, data.cowayWaterFilterExpense)

    // จัดกลุ่มรายจ่าย
    const rentEntry: [string, number] = ['ค่าเช่าอาคาร', data.expenseByCategory?.['ค่าเช่าอาคาร'] || 0]
    const salaryEntry: [string, number] = ['เงินเดือนพนักงาน', data.expenseByCategory?.['เงินเดือนพนักงาน'] || 0]
    const otherExpenseEntries = expenseEntries.filter(([name]) =>
      name !== 'ค่าเช่าอาคาร' &&
      name !== 'เงินเดือนพนักงาน' &&
      !globalExpenseNames.includes(name)
    )

    return `
      <div style="font-family: 'Sarabun', Arial, sans-serif; padding: 0; background: white; color: #333; width: 750px; min-height: 1050px; display: flex; flex-direction: column; box-sizing: border-box;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #84A59D 0%, #6b8a84 100%); padding: 20px 30px; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="width: 50px; height: 50px; background: #F6BD60; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                <span style="font-size: 18px; font-weight: bold; color: #84A59D;">ASW</span>
              </div>
              <div>
                <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">ARUN SA WAD</h1>
                <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Monthly Financial Report</p>
              </div>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 12px; opacity: 0.8;">รายงานประจำเดือน</p>
              <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold;">${monthYear}</p>
            </div>
          </div>
        </div>

        <!-- Building Title Bar -->
        <div style="background: linear-gradient(90deg, #F6BD60 0%, #e5a84f 100%); padding: 12px 30px;">
          <h2 style="margin: 0; font-size: 16px; color: #333; font-weight: bold;">📍 ${buildingName}</h2>
        </div>

        <!-- Main Content -->
        <div style="flex: 1; padding: 20px 25px;">
          <div style="display: flex; gap: 20px; height: 100%;">
            <!-- รายรับ -->
            <div style="flex: 1; display: flex; flex-direction: column;">
              <div style="background: linear-gradient(135deg, #84A59D 0%, #5a7d75 100%); color: white; padding: 12px 16px; border-radius: 12px 12px 0 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">📈</span>
                <strong>รายรับ</strong>
              </div>
              <div style="border: 2px solid #84A59D30; border-top: none; border-radius: 0 0 12px 12px; overflow: hidden; flex: 1; background: white;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <thead>
                    <tr style="background: #84A59D10;">
                      <th style="padding: 8px 10px; text-align: center; border-bottom: 2px solid #84A59D30; width: 30px; color: #666;">#</th>
                      <th style="padding: 8px 10px; text-align: left; border-bottom: 2px solid #84A59D30; color: #333;">รายการ</th>
                      <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #84A59D30; width: 80px; color: #333;">จำนวน (฿)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${incomeEntries.map(([name, amount], i) => `
                      <tr style="background: ${i % 2 === 0 ? 'white' : '#f9fafb'};">
                        <td style="padding: 6px 10px; border-bottom: 1px solid #eee; color: #999; text-align: center; font-size: 9px;">${i + 1}</td>
                        <td style="padding: 6px 10px; border-bottom: 1px solid #eee;">
                          <span style="color: ${amount === 0 ? '#ccc' : '#333'};">${getCategoryEmoji(name)} ${name}</span>
                        </td>
                        <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #eee; font-weight: 500; color: ${amount === 0 ? '#ccc' : '#5a7d75'};">${formatNumber(amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background: linear-gradient(90deg, #84A59D20, #84A59D40);">
                      <td colspan="2" style="padding: 10px; font-weight: bold; color: #5a7d75; font-size: 11px;">รวมรายได้</td>
                      <td style="padding: 10px; text-align: right; font-weight: bold; color: #5a7d75; font-size: 12px;">${formatNumber(data.totalIncome)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- รายจ่าย -->
            <div style="flex: 1; display: flex; flex-direction: column;">
              <div style="background: linear-gradient(135deg, #F28482 0%, #d96f6d 100%); color: white; padding: 12px 16px; border-radius: 12px 12px 0 0; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">📉</span>
                <strong>รายจ่าย</strong>
              </div>
              <div style="border: 2px solid #F2848230; border-top: none; border-radius: 0 0 12px 12px; overflow: hidden; flex: 1; background: white;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <thead>
                    <tr style="background: #F2848210;">
                      <th style="padding: 8px 10px; text-align: center; border-bottom: 2px solid #F2848230; width: 30px; color: #666;">#</th>
                      <th style="padding: 8px 10px; text-align: left; border-bottom: 2px solid #F2848230; color: #333;">รายการ</th>
                      <th style="padding: 8px 10px; text-align: right; border-bottom: 2px solid #F2848230; width: 80px; color: #333;">จำนวน (฿)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- 1. ค่าเช่าอาคาร -->
                    <tr style="background: #F6BD6015;">
                      <td style="padding: 6px 10px; border-bottom: 1px solid #eee; color: #999; text-align: center; font-size: 9px;">1</td>
                      <td style="padding: 6px 10px; border-bottom: 1px solid #eee;">
                        <span style="color: ${rentEntry[1] === 0 ? '#ccc' : '#D4A24C'};">🏢 ค่าเช่าอาคาร</span>
                      </td>
                      <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #eee; font-weight: 500; color: ${rentEntry[1] === 0 ? '#ccc' : '#D4A24C'};">${formatNumber(rentEntry[1])}</td>
                    </tr>
                    <!-- 2. เงินเดือนพนักงาน -->
                    <tr style="background: #84A59D10;">
                      <td style="padding: 6px 10px; border-bottom: 1px solid #eee; color: #999; text-align: center; font-size: 9px;">2</td>
                      <td style="padding: 6px 10px; border-bottom: 1px solid #eee;">
                        <span style="color: ${salaryEntry[1] === 0 ? '#ccc' : '#5a7d75'};">👥 เงินเดือนพนักงาน</span>
                      </td>
                      <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #eee; font-weight: 500; color: ${salaryEntry[1] === 0 ? '#ccc' : '#5a7d75'};">${formatNumber(salaryEntry[1])}</td>
                    </tr>
                    <!-- 3. ค่าใช้จ่ายส่วนกลาง -->
                    ${pdfGlobalExpenseConfig.map((expense, index) => {
                      const shortName = expense.shortName || expense.name
                      return `
                      <tr style="background: ${expense.bgColor};">
                        <td style="padding: 6px 10px; border-bottom: 1px solid #eee; color: #999; text-align: center; font-size: 9px;">${3 + index}</td>
                        <td style="padding: 6px 10px; border-bottom: 1px solid #eee;">
                          <span style="color: ${expense.value === 0 ? '#ccc' : expense.textColor};">${getCategoryEmoji(expense.name)} ${shortName}</span>
                        </td>
                        <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #eee; font-weight: 500; color: ${expense.value === 0 ? '#ccc' : expense.textColor};">${formatNumber(expense.value)}</td>
                      </tr>
                    `}).join('')}
                    <!-- 4. รายจ่ายอื่นๆ -->
                    ${otherExpenseEntries.map(([name, amount], index) => {
                      const baseIndex = 3 + pdfGlobalExpenseConfig.length + index
                      return `
                      <tr style="background: ${index % 2 === 0 ? 'white' : '#fef7f7'};">
                        <td style="padding: 6px 10px; border-bottom: 1px solid #eee; color: #999; text-align: center; font-size: 9px;">${baseIndex}</td>
                        <td style="padding: 6px 10px; border-bottom: 1px solid #eee;">
                          <span style="color: ${amount === 0 ? '#ccc' : '#333'};">${getCategoryEmoji(name)} ${name}</span>
                        </td>
                        <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #eee; font-weight: 500; color: ${amount === 0 ? '#ccc' : '#d96f6d'};">${formatNumber(amount)}</td>
                      </tr>
                    `}).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background: linear-gradient(90deg, #F2848220, #F2848240);">
                      <td colspan="2" style="padding: 10px; font-weight: bold; color: #d96f6d; font-size: 11px;">รวมค่าใช้จ่าย</td>
                      <td style="padding: 10px; text-align: right; font-weight: bold; color: #d96f6d; font-size: 12px;">${formatNumber(data.totalExpense)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; border-top: 1px solid #e5e5e5; padding: 12px 30px; display: flex; justify-content: space-between; align-items: center;">
          <div style="color: #999; font-size: 10px;">
            พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
          </div>
          <div style="color: #666; font-size: 11px; font-weight: 600;">
            หน้า ${pageNumber} / ${totalPages}
          </div>
          <div style="color: #999; font-size: 10px;">
            ARUN SA WAD Report
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

  // ข้อมูลค่าใช้จ่ายส่วนกลางสำหรับ PDF พร้อมสีและรายละเอียด
  const getPdfGlobalExpenseConfig = (buildingCode?: string, cowayWaterFilterExpense: number = 0) => {
    if (!globalSettings) return []

    // เช็คว่าอาคารที่เลือกเป็น 3 อาคาร (NANA, CT, YW) หรือไม่
    const eligibleBuildingsForCare = ['NANA', 'CT', 'YW']
    const isEligibleForCareExpense = !buildingCode || eligibleBuildingsForCare.includes(buildingCode)

    return [
      // ค่าดูแล MAX, ค่าดูแลจราจร, ค่าขนส่งสินค้า - เฉพาะ 3 อาคาร
      ...(isEligibleForCareExpense && globalSettings.maxCareExpensePerBuilding > 0 ? [{
        name: 'ค่าดูแล MAX',
        value: globalSettings.maxCareExpensePerBuilding,
        totalValue: globalSettings.maxCareExpense,
        divisor: globalSettings.careExpenseDivisor,
        bgColor: '#9B59B615',
        textColor: '#9B59B6',
      }] : []),
      ...(isEligibleForCareExpense && globalSettings.trafficCareExpensePerBuilding > 0 ? [{
        name: 'ค่าดูแลจราจร',
        value: globalSettings.trafficCareExpensePerBuilding,
        totalValue: globalSettings.trafficCareExpense,
        divisor: globalSettings.careExpenseDivisor,
        bgColor: '#E74C3C15',
        textColor: '#E74C3C',
      }] : []),
      ...(isEligibleForCareExpense && globalSettings.shippingExpensePerBuilding > 0 ? [{
        name: 'ค่าขนส่งสินค้า',
        value: globalSettings.shippingExpensePerBuilding,
        totalValue: globalSettings.shippingExpense,
        divisor: globalSettings.careExpenseDivisor,
        bgColor: '#F5811820',
        textColor: '#F58118',
      }] : []),
      // ค่าใช้จ่ายส่วนกลาง - ทุกอาคาร (แสดงเสมอ)
      {
        name: 'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)',
        shortName: 'ค่า Amenity',
        value: globalSettings.amenityExpensePerBuilding,
        totalValue: globalSettings.amenityExpense,
        divisor: globalSettings.buildingCount,
        bgColor: '#EC489920',
        textColor: '#EC4899',
      },
      // ค่าเช่าเครื่องกรองน้ำ Coway (ค่าใช้จ่ายแยกตามอาคาร - อยู่หลัง Amenity) - แสดงเสมอ
      {
        name: 'ค่าเช่าเครื่องกรองน้ำ Coway',
        shortName: 'ค่ากรองน้ำ Coway',
        value: cowayWaterFilterExpense,
        totalValue: cowayWaterFilterExpense,
        divisor: 1,
        bgColor: '#06B6D420',
        textColor: '#06B6D4',
      },
      {
        name: 'ค่าน้ำเปล่า',
        shortName: 'ค่าน้ำเปล่า',
        value: globalSettings.waterBottleExpensePerBuilding,
        totalValue: globalSettings.waterBottleExpense,
        divisor: globalSettings.buildingCount,
        bgColor: '#06B6D420',
        textColor: '#06B6D4',
      },
      {
        name: 'ค่าขนมคุ้กกี้',
        shortName: 'ค่าขนมคุ้กกี้',
        value: globalSettings.cookieExpensePerBuilding,
        totalValue: globalSettings.cookieExpense,
        divisor: globalSettings.buildingCount,
        bgColor: '#F59E0B20',
        textColor: '#F59E0B',
      },
      {
        name: 'ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท',
        shortName: 'ค่ากาแฟซอง',
        value: globalSettings.coffeeExpensePerBuilding,
        totalValue: globalSettings.coffeeExpense,
        divisor: globalSettings.buildingCount,
        bgColor: '#B4530040',
        textColor: '#B45300',
      },
      {
        name: 'ค่าน้ำมันรถมอเตอร์ไซค์',
        shortName: 'ค่าน้ำมันรถ',
        value: globalSettings.fuelExpensePerBuilding,
        totalValue: globalSettings.fuelExpense,
        divisor: globalSettings.buildingCount,
        bgColor: '#6B728015',
        textColor: '#6B7280',
      },
      {
        name: 'ค่าเช่าที่จอดรถมอเตอร์ไซค์',
        shortName: 'ค่าเช่าที่จอดรถ',
        value: globalSettings.parkingExpensePerBuilding,
        totalValue: globalSettings.parkingExpense,
        divisor: globalSettings.buildingCount,
        bgColor: '#47556915',
        textColor: '#475569',
      },
      {
        name: 'ค่าซ่อมบำรุงรถมอเตอร์ไซค์',
        shortName: 'ค่าซ่อมบำรุงรถ',
        value: globalSettings.motorcycleMaintenanceExpensePerBuilding,
        totalValue: globalSettings.motorcycleMaintenanceExpense,
        divisor: globalSettings.buildingCount,
        bgColor: '#F4363620',
        textColor: '#F43636',
      },
      {
        name: 'ค่าเดินทางแม่บ้าน',
        shortName: 'ค่าเดินทางแม่บ้าน',
        value: globalSettings.maidTravelExpensePerBuilding,
        totalValue: globalSettings.maidTravelExpense,
        divisor: globalSettings.buildingCount,
        bgColor: '#8B5CF620',
        textColor: '#8B5CF6',
      },
      {
        name: 'ค่าอุปกรณ์ทำความสะอาด',
        shortName: 'ค่าอุปกรณ์ทำความสะอาด',
        value: globalSettings.cleaningSupplyExpensePerBuilding,
        totalValue: globalSettings.cleaningSupplyExpense,
        divisor: globalSettings.buildingCount,
        bgColor: '#14B8A620',
        textColor: '#14B8A6',
      },
      {
        name: 'ค่าน้ำยาสำหรับซักผ้า',
        shortName: 'ค่าน้ำยาซักผ้า',
        value: globalSettings.laundryDetergentExpensePerBuilding,
        totalValue: globalSettings.laundryDetergentExpense,
        divisor: globalSettings.buildingCount,
        bgColor: '#0EA5E920',
        textColor: '#0EA5E9',
      },
    ]
  }

  // หน้า 1: ตารางรายรับ/รายจ่าย (พอดี 1 หน้า - ลดขนาดให้กระชับ)
  const createPDFPage1 = (data: Summary, buildingName: string, pageNumber?: number, totalPages?: number): string => {
    // ดึง categories ทั้งหมดจาก state แล้วจับคู่กับข้อมูลจริง
    const incomeCategories = categories.filter(c => c.type === 'INCOME')
    const expenseCategories = categories.filter(c => c.type === 'EXPENSE')

    // สร้าง entries จากทุก category (แสดงทุกรายการแม้ค่าเป็น 0)
    const incomeEntries: [string, number][] = incomeCategories.map(cat => [
      cat.name,
      data.incomeByChannel?.[cat.name] || 0
    ])

    // รายจ่ายจาก categories
    const expenseEntries: [string, number][] = expenseCategories.map(cat => [
      cat.name,
      data.expenseByCategory?.[cat.name] || 0
    ])

    // ค่าใช้จ่ายส่วนกลางพร้อมข้อมูลครบ
    const pdfGlobalExpenseConfig = getPdfGlobalExpenseConfig(data.buildingCode, data.cowayWaterFilterExpense)

    // จัดเรียงรายจ่าย: ค่าเช่าอาคาร, เงินเดือนพนักงาน, รายจ่ายอื่นๆ
    // ไม่รวมรายการที่ซ้ำกับค่าใช้จ่ายส่วนกลาง (globalExpenseNamesAll)
    const rentEntry: [string, number] = ['ค่าเช่าอาคาร', data.expenseByCategory?.['ค่าเช่าอาคาร'] || 0]
    const salaryEntry: [string, number] = ['เงินเดือนพนักงาน', data.expenseByCategory?.['เงินเดือนพนักงาน'] || 0]
    const otherExpenseEntries = expenseEntries.filter(([name]) =>
      name !== 'ค่าเช่าอาคาร' &&
      name !== 'เงินเดือนพนักงาน' &&
      !globalExpenseNamesAll.includes(name)
    )

    // คำนวณจำนวนรายการทั้งหมด
    const totalExpenseRows = 2 + pdfGlobalExpenseConfig.length + otherExpenseEntries.length

    // คำนวณขนาด font ตามจำนวนรายการ (ถ้ามีหลายรายการให้ลดขนาด)
    const maxRows = Math.max(incomeEntries.length, totalExpenseRows)
    // ปรับขนาดให้เล็กลงเพื่อให้พอดีหน้า - ใช้ขนาดเล็กเสมอเพื่อให้พอดี
    const fontSize = '9px'
    const cellPadding = '3px 4px'
    const headerPadding = '4px'
    const subTextSize = '7px'
    const numColWidth = '20px'
    const amountColWidth = '70px'

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
              <div style="border: 1px solid #84A59D30; border-top: none; border-radius: 0 0 6px 6px; overflow: hidden; flex: 1;">
                <table style="width: 100%; border-collapse: collapse; font-size: ${fontSize}; table-layout: fixed;">
                  <colgroup>
                    <col style="width: ${numColWidth};">
                    <col>
                    <col style="width: ${amountColWidth};">
                  </colgroup>
                  <thead>
                    <tr style="background: #84A59D15;">
                      <th style="padding: ${headerPadding}; text-align: center; border-bottom: 1px solid #84A59D30;">#</th>
                      <th style="padding: ${headerPadding}; text-align: left; border-bottom: 1px solid #84A59D30;">รายการ</th>
                      <th style="padding: ${headerPadding}; text-align: right; border-bottom: 1px solid #84A59D30;">จำนวน</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${incomeEntries.map(([name, amount], i) => `
                      <tr style="background: ${i % 2 === 0 ? 'white' : '#f9fafb'};">
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; color: #666; text-align: center;">${i + 1}</td>
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; overflow: hidden; text-overflow: ellipsis;">
                          ${getCategoryEmoji(name)} ${name}
                        </td>
                        <td style="padding: ${cellPadding}; text-align: right; border-bottom: 1px solid #eee; font-weight: 500; ${amount === 0 ? 'color: #ccc;' : ''}">${formatNumber(amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background: linear-gradient(to right, #84A59D30, #84A59D50);">
                      <td colspan="2" style="padding: ${cellPadding}; font-weight: bold; color: #5a7d75;">รวมรายได้</td>
                      <td style="padding: ${cellPadding}; text-align: right; font-weight: bold; color: #5a7d75;">${formatNumber(data.totalIncome)}</td>
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
              <div style="border: 1px solid #F2848230; border-top: none; border-radius: 0 0 6px 6px; overflow: hidden; flex: 1;">
                <table style="width: 100%; border-collapse: collapse; font-size: ${fontSize}; table-layout: fixed;">
                  <colgroup>
                    <col style="width: ${numColWidth};">
                    <col>
                    <col style="width: ${amountColWidth};">
                  </colgroup>
                  <thead>
                    <tr style="background: #F2848215;">
                      <th style="padding: ${headerPadding}; text-align: center; border-bottom: 1px solid #F2848230;">#</th>
                      <th style="padding: ${headerPadding}; text-align: left; border-bottom: 1px solid #F2848230;">รายการ</th>
                      <th style="padding: ${headerPadding}; text-align: right; border-bottom: 1px solid #F2848230;">จำนวน</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${/* 1. ค่าเช่าอาคาร */`
                      <tr style="background: #F6BD6020;">
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; color: #666; text-align: center;">1</td>
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; overflow: hidden;">
                          <div style="color: ${rentEntry[1] === 0 ? '#ccc' : '#D4A24C'};">
                            ${getCategoryEmoji('ค่าเช่าอาคาร')} ค่าเช่าอาคาร
                          </div>
                        </td>
                        <td style="padding: ${cellPadding}; text-align: right; border-bottom: 1px solid #eee; font-weight: 500; color: ${rentEntry[1] === 0 ? '#ccc' : '#D4A24C'};">${formatNumber(rentEntry[1])}</td>
                      </tr>
                    `}
                    ${/* 2. เงินเดือนพนักงาน */`
                      <tr style="background: #84A59D15;">
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; color: #666; text-align: center;">2</td>
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; overflow: hidden;">
                          <div style="color: ${salaryEntry[1] === 0 ? '#ccc' : '#84A59D'};">
                            ${getCategoryEmoji('เงินเดือนพนักงาน')} เงินเดือนพนักงาน
                          </div>
                        </td>
                        <td style="padding: ${cellPadding}; text-align: right; border-bottom: 1px solid #eee; font-weight: 500; color: ${salaryEntry[1] === 0 ? '#ccc' : '#84A59D'};">${formatNumber(salaryEntry[1])}</td>
                      </tr>
                    `}
                    ${/* 3. ค่าใช้จ่ายส่วนกลาง */
                    pdfGlobalExpenseConfig.map((expense, index) => {
                      const baseIndex = 2 + index + 1
                      const shortName = expense.shortName || expense.name
                      return `
                      <tr style="background: ${expense.bgColor};">
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; color: #666; text-align: center;">${baseIndex}</td>
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; overflow: hidden;">
                          <div style="color: ${expense.value === 0 ? '#ccc' : expense.textColor};">
                            ${getCategoryEmoji(expense.name)} ${shortName}
                          </div>
                        </td>
                        <td style="padding: ${cellPadding}; text-align: right; border-bottom: 1px solid #eee; font-weight: 500; color: ${expense.value === 0 ? '#ccc' : expense.textColor};">${formatNumber(expense.value)}</td>
                      </tr>
                    `}).join('')}
                    ${/* 4. รายจ่ายอื่นๆ */
                    otherExpenseEntries.map(([name, amount], index) => {
                      const baseIndex = 2 + pdfGlobalExpenseConfig.length + index + 1
                      return `
                      <tr style="background: ${index % 2 === 0 ? 'white' : '#fef7f7'};">
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; color: #666; text-align: center;">${baseIndex}</td>
                        <td style="padding: ${cellPadding}; border-bottom: 1px solid #eee; overflow: hidden; text-overflow: ellipsis;">
                          ${getCategoryEmoji(name)} ${name}
                        </td>
                        <td style="padding: ${cellPadding}; text-align: right; border-bottom: 1px solid #eee; font-weight: 500; ${amount === 0 ? 'color: #ccc;' : ''}">${formatNumber(amount)}</td>
                      </tr>
                    `}).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background: linear-gradient(to right, #F2848230, #F2848250);">
                      <td colspan="2" style="padding: ${cellPadding}; font-weight: bold; color: #d96f6d;">รวมค่าใช้จ่าย</td>
                      <td style="padding: ${cellPadding}; text-align: right; font-weight: bold; color: #d96f6d;">${formatNumber(data.totalExpense)}</td>
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

  // Export to PDF - Single Building (ใช้ html2canvas รองรับภาษาไทย) - Modern Design 2 หน้า
  const handleExportPDF = async (data: Summary, buildingName: string) => {
    setExportingPDF(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = 210
      const margin = 10
      const contentWidth = pdfWidth - (margin * 2)
      const totalPages = 2

      // รายการค่าใช้จ่ายส่วนกลาง
      const globalExpenseNames = [
        'ค่าดูแล MAX', 'ค่าดูแลจราจร', 'ค่าขนส่งสินค้า',
        'ค่า Amenity', 'ค่าน้ำเปล่า', 'ค่าขนมคุ้กกี้',
        'ค่ากาแฟ', 'ค่าน้ำมัน', 'ค่าเช่าที่จอดรถ',
        'ค่าซ่อมบำรุงรถ', 'ค่าเดินทางแม่บ้าน',
        'ค่าอุปกรณ์ทำความสะอาด', 'ค่าน้ำยาสำหรับซักผ้า', 'ค่าน้ำยาซักผ้า',
        'ค่าเช่าเครื่องกรองน้ำ Coway',
        'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)',
        'ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท',
        'ค่าน้ำมันรถมอเตอร์ไซค์',
        'ค่าเช่าที่จอดรถมอเตอร์ไซค์',
        'ค่าซ่อมบำรุงรถมอเตอร์ไซค์',
      ]

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

      // หน้า 1: Summary Cards + กราฟ (Modern Design)
      await addPageFromHTML(createModernSummaryPage(data, buildingName, 1, totalPages), true)

      // หน้า 2: ตารางรายรับ/รายจ่าย (Modern Design)
      await addPageFromHTML(createModernTablePage(data, buildingName, 2, totalPages, globalExpenseNames), false)

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

  // Export All Buildings to PDF (ใช้ html2canvas รองรับภาษาไทย) - Modern Design 2 หน้าต่ออาคาร
  const handleExportAllPDF = async () => {
    if (!allSummaryData) return

    setExportingPDF(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = 210
      const margin = 10
      const contentWidth = pdfWidth - (margin * 2)

      // รายการค่าใช้จ่ายส่วนกลาง
      const globalExpenseNames = [
        'ค่าดูแล MAX', 'ค่าดูแลจราจร', 'ค่าขนส่งสินค้า',
        'ค่า Amenity', 'ค่าน้ำเปล่า', 'ค่าขนมคุ้กกี้',
        'ค่ากาแฟ', 'ค่าน้ำมัน', 'ค่าเช่าที่จอดรถ',
        'ค่าซ่อมบำรุงรถ', 'ค่าเดินทางแม่บ้าน',
        'ค่าอุปกรณ์ทำความสะอาด', 'ค่าน้ำยาสำหรับซักผ้า', 'ค่าน้ำยาซักผ้า',
        'ค่าเช่าเครื่องกรองน้ำ Coway',
        'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)',
        'ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท',
        'ค่าน้ำมันรถมอเตอร์ไซค์',
        'ค่าเช่าที่จอดรถมอเตอร์ไซค์',
        'ค่าซ่อมบำรุงรถมอเตอร์ไซค์',
      ]

      // คำนวณจำนวนหน้าทั้งหมด (อาคาร × 2 + หน้าสรุป)
      const totalPages = (allSummaryData.buildings.length * 2) + 1

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

      // สร้าง PDF สำหรับแต่ละอาคาร (2 หน้าต่ออาคาร - Modern Design)
      for (let i = 0; i < allSummaryData.buildings.length; i++) {
        const building = allSummaryData.buildings[i]
        const page1Number = (i * 2) + 1
        const page2Number = (i * 2) + 2

        // หน้า 1: Summary Cards + กราฟ (Modern Design)
        await addPageFromHTML(createModernSummaryPage(building, building.buildingName, page1Number, totalPages), i === 0)

        // หน้า 2: ตารางรายรับ/รายจ่าย (Modern Design)
        await addPageFromHTML(createModernTablePage(building, building.buildingName, page2Number, totalPages, globalExpenseNames), false)
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
    // รายการค่าใช้จ่ายส่วนกลาง (เหมือน PDF export)
    const globalExpenseNames = [
      'ค่าดูแล MAX', 'ค่าดูแลจราจร', 'ค่าขนส่งสินค้า',
      'ค่า Amenity', 'ค่าน้ำเปล่า', 'ค่าขนมคุ้กกี้',
      'ค่ากาแฟ', 'ค่าน้ำมัน', 'ค่าเช่าที่จอดรถ',
      'ค่าซ่อมบำรุงรถ', 'ค่าเดินทางแม่บ้าน',
      'ค่าอุปกรณ์ทำความสะอาด', 'ค่าน้ำยาสำหรับซักผ้า', 'ค่าน้ำยาซักผ้า',
      'ค่าเช่าเครื่องกรองน้ำ Coway',
      'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)',
      'ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท',
      'ค่าน้ำมันรถมอเตอร์ไซค์',
      'ค่าเช่าที่จอดรถมอเตอร์ไซค์',
      'ค่าซ่อมบำรุงรถมอเตอร์ไซค์',
    ]

    // สร้าง HTML content เหมือน PDF (Modern Layout 2 หน้า)
    const page1 = createModernSummaryPage(data, buildingName, 1, 2)
    const page2 = createModernTablePage(data, buildingName, 2, 2, globalExpenseNames)

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

    // รายการค่าใช้จ่ายส่วนกลาง (เหมือน PDF export)
    const globalExpenseNames = [
      'ค่าดูแล MAX', 'ค่าดูแลจราจร', 'ค่าขนส่งสินค้า',
      'ค่า Amenity', 'ค่าน้ำเปล่า', 'ค่าขนมคุ้กกี้',
      'ค่ากาแฟ', 'ค่าน้ำมัน', 'ค่าเช่าที่จอดรถ',
      'ค่าซ่อมบำรุงรถ', 'ค่าเดินทางแม่บ้าน',
      'ค่าอุปกรณ์ทำความสะอาด', 'ค่าน้ำยาสำหรับซักผ้า', 'ค่าน้ำยาซักผ้า',
      'ค่าเช่าเครื่องกรองน้ำ Coway',
      'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)',
      'ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท',
      'ค่าน้ำมันรถมอเตอร์ไซค์',
      'ค่าเช่าที่จอดรถมอเตอร์ไซค์',
      'ค่าซ่อมบำรุงรถมอเตอร์ไซค์',
    ]

    // คำนวณจำนวนหน้าทั้งหมด (2 หน้าต่ออาคาร + 1 หน้าสรุป)
    const totalPages = allSummaryData.buildings.length * 2 + 1

    // สร้าง HTML content สำหรับทุกอาคาร (Modern Layout 2 หน้าต่ออาคาร)
    let allPages = ''
    let pageNumber = 1
    for (const building of allSummaryData.buildings) {
      allPages += `<div class="page">${createModernSummaryPage(building, building.buildingName, pageNumber, totalPages)}</div>`
      pageNumber++
      allPages += `<div class="page">${createModernTablePage(building, building.buildingName, pageNumber, totalPages, globalExpenseNames)}</div>`
      pageNumber++
    }
    // เพิ่มหน้าสรุปรวม
    allPages += `<div class="page">${createTotalSummaryContent(allSummaryData.total, allSummaryData.buildings, pageNumber, totalPages)}</div>`

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
  // รายการค่าใช้จ่ายส่วนกลาง - ไม่รวมใน regularExpenseEntries
  // รวมทั้งชื่อที่แสดงในหน้าจัดการค่าใช้จ่ายส่วนกลาง และชื่อใน categories database
  const globalExpenseNamesAll = [
    // ชื่อที่แสดงในหน้าดาวน์โหลด (จาก GlobalSettings)
    'ค่าดูแล MAX',
    'ค่าดูแลจราจร',
    'ค่าขนส่งสินค้า',
    'ค่า Amenity',
    'ค่าน้ำเปล่า',
    'ค่าขนมคุ้กกี้',
    'ค่ากาแฟ',
    'ค่าน้ำมัน',
    'ค่าเช่าที่จอดรถ',
    'ค่าซ่อมบำรุงรถ',
    'ค่าเดินทางแม่บ้าน',
    'ค่าอุปกรณ์ทำความสะอาด',
    'ค่าน้ำยาสำหรับซักผ้า',
    'ค่าน้ำยาซักผ้า',
    // ค่าใช้จ่ายแยกอาคาร (จาก Settings)
    'ค่าเช่าเครื่องกรองน้ำ Coway',
    // ชื่อใน categories database ที่ซ้ำซ้อน
    'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)',
    'ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท',
    'ค่าน้ำมันรถมอเตอร์ไซค์',
    'ค่าเช่าที่จอดรถมอเตอร์ไซค์',
    'ค่าซ่อมบำรุงรถมอเตอร์ไซค์',
  ]

  // ข้อมูลค่าใช้จ่ายส่วนกลางพร้อมสีและรายละเอียด
  const getGlobalExpenseConfig = (cowayWaterFilterExpense: number = 0) => {
    if (!globalSettings) return []

    // เช็คว่าอาคารที่เลือกเป็น 3 อาคาร (NANA, CT, YW) หรือไม่
    const selectedBuildingCode = buildings.find((b) => String(b.id) === selectedBuilding)?.code || ''
    const eligibleBuildingsForCare = ['NANA', 'CT', 'YW']
    const isEligibleForCareExpense = selectedBuilding === 'all' || eligibleBuildingsForCare.includes(selectedBuildingCode)

    return [
      // ค่าดูแล MAX, ค่าดูแลจราจร, ค่าขนส่งสินค้า - เฉพาะ 3 อาคาร
      ...(isEligibleForCareExpense && globalSettings.maxCareExpensePerBuilding > 0 ? [{
        name: 'ค่าดูแล MAX',
        value: globalSettings.maxCareExpensePerBuilding,
        totalValue: globalSettings.maxCareExpense,
        divisor: globalSettings.careExpenseDivisor,
        bgClass: 'bg-[#9B59B6]/10',
        textClass: 'text-[#9B59B6]',
      }] : []),
      ...(isEligibleForCareExpense && globalSettings.trafficCareExpensePerBuilding > 0 ? [{
        name: 'ค่าดูแลจราจร',
        value: globalSettings.trafficCareExpensePerBuilding,
        totalValue: globalSettings.trafficCareExpense,
        divisor: globalSettings.careExpenseDivisor,
        bgClass: 'bg-[#E74C3C]/10',
        textClass: 'text-[#E74C3C]',
      }] : []),
      ...(isEligibleForCareExpense && globalSettings.shippingExpensePerBuilding > 0 ? [{
        name: 'ค่าขนส่งสินค้า',
        value: globalSettings.shippingExpensePerBuilding,
        totalValue: globalSettings.shippingExpense,
        divisor: globalSettings.careExpenseDivisor,
        bgClass: 'bg-orange-100/50',
        textClass: 'text-orange-600',
      }] : []),
      // ค่าใช้จ่ายส่วนกลาง - ทุกอาคาร (แสดงเสมอ)
      {
        name: 'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)',
        value: globalSettings.amenityExpensePerBuilding,
        totalValue: globalSettings.amenityExpense,
        divisor: globalSettings.buildingCount,
        bgClass: 'bg-pink-100/50',
        textClass: 'text-pink-500',
      },
      // ค่าเช่าเครื่องกรองน้ำ Coway (ค่าใช้จ่ายแยกตามอาคาร - อยู่หลัง Amenity) - แสดงเสมอ
      {
        name: 'ค่าเช่าเครื่องกรองน้ำ Coway',
        value: cowayWaterFilterExpense,
        totalValue: cowayWaterFilterExpense,
        divisor: 1,
        bgClass: 'bg-cyan-100/50',
        textClass: 'text-cyan-600',
        isPerBuilding: true, // flag บอกว่าเป็นค่าแยกตามอาคาร
      },
      {
        name: 'ค่าน้ำเปล่า',
        value: globalSettings.waterBottleExpensePerBuilding,
        totalValue: globalSettings.waterBottleExpense,
        divisor: globalSettings.buildingCount,
        bgClass: 'bg-cyan-100/50',
        textClass: 'text-cyan-500',
      },
      {
        name: 'ค่าขนมคุ้กกี้',
        value: globalSettings.cookieExpensePerBuilding,
        totalValue: globalSettings.cookieExpense,
        divisor: globalSettings.buildingCount,
        bgClass: 'bg-amber-100/50',
        textClass: 'text-amber-500',
      },
      {
        name: 'ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท',
        value: globalSettings.coffeeExpensePerBuilding,
        totalValue: globalSettings.coffeeExpense,
        divisor: globalSettings.buildingCount,
        bgClass: 'bg-amber-200/50',
        textClass: 'text-amber-700',
      },
      {
        name: 'ค่าน้ำมันรถมอเตอร์ไซค์',
        value: globalSettings.fuelExpensePerBuilding,
        totalValue: globalSettings.fuelExpense,
        divisor: globalSettings.buildingCount,
        bgClass: 'bg-gray-100/50',
        textClass: 'text-gray-600',
      },
      {
        name: 'ค่าเช่าที่จอดรถมอเตอร์ไซค์',
        value: globalSettings.parkingExpensePerBuilding,
        totalValue: globalSettings.parkingExpense,
        divisor: globalSettings.buildingCount,
        bgClass: 'bg-slate-100/50',
        textClass: 'text-slate-600',
      },
      {
        name: 'ค่าซ่อมบำรุงรถมอเตอร์ไซค์',
        value: globalSettings.motorcycleMaintenanceExpensePerBuilding,
        totalValue: globalSettings.motorcycleMaintenanceExpense,
        divisor: globalSettings.buildingCount,
        bgClass: 'bg-rose-100/50',
        textClass: 'text-rose-600',
      },
      {
        name: 'ค่าเดินทางแม่บ้าน',
        value: globalSettings.maidTravelExpensePerBuilding,
        totalValue: globalSettings.maidTravelExpense,
        divisor: globalSettings.buildingCount,
        bgClass: 'bg-violet-100/50',
        textClass: 'text-violet-600',
      },
      {
        name: 'ค่าอุปกรณ์ทำความสะอาด',
        value: globalSettings.cleaningSupplyExpensePerBuilding,
        totalValue: globalSettings.cleaningSupplyExpense,
        divisor: globalSettings.buildingCount,
        bgClass: 'bg-teal-100/50',
        textClass: 'text-teal-600',
      },
      {
        name: 'ค่าน้ำยาสำหรับซักผ้า',
        value: globalSettings.laundryDetergentExpensePerBuilding,
        totalValue: globalSettings.laundryDetergentExpense,
        divisor: globalSettings.buildingCount,
        bgClass: 'bg-sky-100/50',
        textClass: 'text-sky-600',
      },
    ]
  }

  const renderDetailTables = (data: Summary) => {
    // ดึง categories ทั้งหมดจาก state แล้วจับคู่กับข้อมูลจริง
    const incomeCategories = categories.filter(c => c.type === 'INCOME')
    const expenseCategories = categories.filter(c => c.type === 'EXPENSE')

    // สร้าง entries จากทุก category (แสดงทุกรายการแม้ค่าเป็น 0)
    const incomeEntries: [string, number][] = incomeCategories.map(cat => [
      cat.name,
      data.incomeByChannel?.[cat.name] || 0
    ])

    // รายจ่ายจาก categories (ไม่รวมค่าใช้จ่ายส่วนกลางที่ดึงจาก GlobalSettings)
    const expenseEntries: [string, number][] = expenseCategories.map(cat => [
      cat.name,
      data.expenseByCategory?.[cat.name] || 0
    ])

    // ค่าใช้จ่ายส่วนกลางพร้อมข้อมูลครบ (รวม ค่าเช่าเครื่องกรองน้ำ Coway)
    const globalExpenseConfig = getGlobalExpenseConfig(data.cowayWaterFilterExpense)

    // แยกรายได้เป็น 2 กลุ่ม: ค่าเช่า และ รายได้อื่นๆ
    const rentalIncomeEntries = incomeEntries.filter(([name]) => name.includes('ค่าเช่า'))
    const otherIncomeEntries = incomeEntries.filter(([name]) => !name.includes('ค่าเช่า'))
    const totalRentalIncome = rentalIncomeEntries.reduce((sum, [, v]) => sum + v, 0)
    const totalOtherIncome = otherIncomeEntries.reduce((sum, [, v]) => sum + v, 0)

    // แยกรายจ่าย: ค่าเช่าอาคาร, เงินเดือนพนักงาน, และอื่นๆ (จาก categories)
    // ไม่รวมรายการที่ซ้ำกับค่าใช้จ่ายส่วนกลาง (globalExpenseNamesAll)
    const rentEntry: [string, number] = ['ค่าเช่าอาคาร', data.expenseByCategory?.['ค่าเช่าอาคาร'] || 0]
    const salaryEntry: [string, number] = ['เงินเดือนพนักงาน', data.expenseByCategory?.['เงินเดือนพนักงาน'] || 0]
    const otherExpenseEntries = expenseEntries.filter(([name]) =>
      name !== 'ค่าเช่าอาคาร' &&
      name !== 'เงินเดือนพนักงาน' &&
      !globalExpenseNamesAll.includes(name)
    )

    return (
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        {/* รายรับ */}
        <div className="overflow-hidden rounded-lg border border-[#84A59D]/30">
          <div className="bg-[#84A59D] px-4 py-2">
            <h4 className="font-bold text-white">รายรับ</h4>
          </div>

          {/* กลุ่ม 1: รายได้ค่าเช่า */}
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
                  <td className={`px-4 py-2 text-right text-sm ${value === 0 ? 'text-slate-300' : ''}`}>{formatNumber(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* กลุ่ม 2: รายได้อื่นๆ */}
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
                  <td className={`px-4 py-2 text-right text-sm ${value === 0 ? 'text-slate-300' : ''}`}>{formatNumber(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

            {/* Footer รวมรายได้ */}
          <div className="bg-[#84A59D]/20 px-4 py-2">
            <div className="flex justify-between">
              <span className="font-bold text-[#84A59D]">รวมรายได้</span>
              <span className="font-bold text-[#84A59D]">{formatNumber(data.totalIncome)}</span>
            </div>
          </div>
        </div>

        {/* รายจ่าย */}
        <div className="overflow-hidden rounded-lg border border-[#F28482]/30">
          <div className="bg-[#F28482] px-4 py-2">
            <h4 className="font-bold text-white">รายจ่าย</h4>
          </div>
          <table className="w-full">
            <tbody>
              {/* 1. ค่าเช่าอาคาร */}
              <tr className="bg-[#F6BD60]/10">
                <td className="px-4 py-2 text-sm w-[40px]">1</td>
                <td className="px-4 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CategoryIcon name="ค่าเช่าอาคาร" className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <span className="text-[#D4A24C] font-medium">ค่าเช่าอาคาร</span>
                      <p className="text-xs text-slate-400">(ดึงจากหน้าตั้งค่าอาคาร)</p>
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-2 text-right text-sm font-medium ${rentEntry[1] === 0 ? 'text-slate-300' : 'text-[#D4A24C]'}`}>{formatNumber(rentEntry[1])}</td>
              </tr>
              {/* 2. เงินเดือนพนักงาน */}
              <tr className="bg-[#84A59D]/10">
                <td className="px-4 py-2 text-sm w-[40px]">2</td>
                <td className="px-4 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CategoryIcon name="เงินเดือนพนักงาน" className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <span className="text-[#84A59D] font-medium">เงินเดือนพนักงาน</span>
                      <p className="text-xs text-[#84A59D]">(คำนวณจากหน้าเงินเดือนพนักงาน)</p>
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-2 text-right text-sm font-medium ${salaryEntry[1] === 0 ? 'text-slate-300' : 'text-[#84A59D]'}`}>{formatNumber(salaryEntry[1])}</td>
              </tr>
              {/* 3. ค่าใช้จ่ายส่วนกลาง */}
              {globalExpenseConfig.map((expense, index) => {
                const baseIndex = 2 + index + 1
                return (
                  <tr key={expense.name} className={expense.bgClass}>
                    <td className="px-4 py-2 text-sm w-[40px]">{baseIndex}</td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CategoryIcon name={expense.name} className="h-4 w-4 flex-shrink-0" />
                        <div>
                          <span className={`font-medium ${expense.value === 0 ? 'text-slate-400' : expense.textClass}`}>{expense.name}</span>
                          <p className={`text-xs ${expense.value === 0 ? 'text-slate-300' : expense.textClass}`}>
                            (ดึงจากหน้าตั้งค่า: {formatNumber(expense.totalValue)} / {expense.divisor} อาคาร)
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-2 text-right text-sm font-medium ${expense.value === 0 ? 'text-slate-300' : expense.textClass}`}>{formatNumber(expense.value)}</td>
                  </tr>
                )
              })}
              {/* 4. รายจ่ายอื่นๆ */}
              {otherExpenseEntries.map(([name, value], index) => {
                const baseIndex = 2 + globalExpenseConfig.length + index + 1
                return (
                  <tr key={name} className={index % 2 === 0 ? 'bg-white' : 'bg-[#F28482]/5'}>
                    <td className="px-4 py-2 text-sm w-[40px]">{baseIndex}</td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CategoryIcon name={name} className="h-4 w-4 flex-shrink-0" />
                        <span>{name}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-2 text-right text-sm ${value === 0 ? 'text-slate-300' : ''}`}>{formatNumber(value)}</td>
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
