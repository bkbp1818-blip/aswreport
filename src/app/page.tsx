'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatNumber, MONTHS, getMonthName } from '@/lib/utils'
import { BUILDING_COLORS_ARRAY, getBuildingColor } from '@/lib/building-colors'
import { generateYears } from '@/lib/calculations'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Calculator,
  Receipt,
  Users,
} from 'lucide-react'

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
  managementFeePercent: number
  managementFee: number
  vatPercent: number
  littleHotelierExpense: number
  monthlyRent: number
  netProfit: number
  amountToBePaid: number
  incomeByChannel: Record<string, number>
  expenseByCategory: Record<string, number>
}

interface SummaryData {
  buildings: Summary[]
  total: Summary
}

interface SalarySummary {
  totalSalary: number
  buildingCount: number
  salaryPerBuilding: number
}

// สีแบรนด์สำหรับกราฟวงกลม - ตามสีแบรนด์จริง
const BRAND_COLORS: Record<string, string> = {
  'Direct Booking': '#1d3557',  // Deep Space Blue
  'AirBNB': '#FF5A5F',          // Airbnb Rausch (ชมพูแดง)
  'Booking': '#003580',         // Booking.com Dark Blue
  'Agoda': '#5392F9',           // Agoda Blue
  'Trip': '#287DFA',            // Trip.com Blue
  'Expedia': '#FFCC00',         // Expedia Yellow
  'RB': '#6B4C9A',              // Roombix Purple
  'PayPal': '#003087',          // PayPal Blue
  'Credit Card': '#1A1F71',     // Visa Blue
  'Bank Transfer': '#00A651',   // Bank Green
}

// ฟังก์ชันดึงสีตามชื่อช่องทาง
const getChannelColor = (channelName: string): string => {
  const name = channelName.replace('ค่าเช่าจาก ', '')
  return BRAND_COLORS[name] || '#6B7280'
}

// สีสำรองสำหรับกราฟ (ถ้าไม่ match กับชื่อ)
const FALLBACK_COLORS = [
  '#1d3557', '#FF5A5F', '#003580', '#5392F9',
  '#287DFA', '#FFCC00', '#6B4C9A', '#6B7280'
]

// สีมาตรฐานสำหรับกราฟแท่ง
const CHART_COLORS = {
  income: '#5B8A7D',    // เขียว - รายรับ
  expense: '#E8837B',   // แดง - รายจ่าย
  profit: '#D4A24C',    // ทอง - กำไรสุทธิ
}

// ฟังก์ชันแสดงตัวเลขบน label (ใส่ comma คั่นหลักพัน)
const formatLabelNumber = (value: number): string => {
  return Math.round(value).toLocaleString('en-US')
}

// ฟังก์ชันแสดงตัวเลขทศนิยม 2 ตำแหน่ง (ใส่ comma คั่นหลักพัน)
const formatDecimalNumber = (value: number): string => {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Custom XAxis Tick สำหรับแสดงเดือนและตัวเลขใต้กราฟแท่งเดี่ยว
interface CustomTickProps {
  x?: number
  y?: number
  payload?: { value: string }
  data: Array<{ name: string; [key: string]: number | string }>
  dataKey: string
  color: string
}

const CustomXAxisTick = ({ x = 0, y = 0, payload, data, dataKey, color }: CustomTickProps) => {
  const entry = data.find((d) => d.name === payload?.value)
  const value = entry ? Number(entry[dataKey]) : 0
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12}>
        {payload?.value}
      </text>
      <text x={0} y={18} dy={16} textAnchor="middle" fill={color} fontSize={11} fontWeight="bold">
        {formatLabelNumber(value)}
      </text>
    </g>
  )
}

// Custom XAxis Tick สำหรับกราฟเปรียบเทียบ (3 แท่ง)
interface CustomCompareTickProps {
  x?: number
  y?: number
  payload?: { value: string }
  data: Array<{ name: string; รายรับ: number; รายจ่าย: number; กำไรสุทธิ: number }>
}

const CustomCompareXAxisTick = ({ x = 0, y = 0, payload, data }: CustomCompareTickProps) => {
  const entry = data.find((d) => d.name === payload?.value)
  const income = entry ? entry.รายรับ : 0
  const expense = entry ? entry.รายจ่าย : 0
  const profit = entry ? entry.กำไรสุทธิ : 0
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#666" fontSize={11}>
        {payload?.value}
      </text>
      <text x={0} y={14} dy={12} textAnchor="middle" fill={CHART_COLORS.income} fontSize={9}>
        {formatLabelNumber(income)}
      </text>
      <text x={0} y={26} dy={12} textAnchor="middle" fill={CHART_COLORS.expense} fontSize={9}>
        {formatLabelNumber(expense)}
      </text>
      <text x={0} y={38} dy={12} textAnchor="middle" fill={CHART_COLORS.profit} fontSize={9} fontWeight="bold">
        {formatLabelNumber(profit)}
      </text>
    </g>
  )
}

// Custom XAxis Tick สำหรับกราฟ "ทุกอาคาร" (แท่งเดียว) - แสดงตัวเลขทศนิยม 2 ตำแหน่งใต้ชื่ออาคาร
interface AllBuildingTickProps {
  x?: number
  y?: number
  payload?: { value: string }
  data: Array<{ name: string; [key: string]: number | string }>
  dataKey: string
  color: string
}

const AllBuildingXAxisTick = ({ x = 0, y = 0, payload, data, dataKey, color }: AllBuildingTickProps) => {
  const entry = data.find((d) => d.name === payload?.value)
  const value = entry ? Number(entry[dataKey]) : 0
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12}>
        {payload?.value}
      </text>
      <text x={0} y={18} dy={16} textAnchor="middle" fill={color} fontSize={10} fontWeight="bold">
        {formatDecimalNumber(value)}
      </text>
    </g>
  )
}

// Custom XAxis Tick สำหรับกราฟ "ทุกอาคาร" เปรียบเทียบ (3 แท่ง) - แสดงตัวเลขทศนิยม 2 ตำแหน่งใต้ชื่ออาคาร
interface AllBuildingCompareTickProps {
  x?: number
  y?: number
  payload?: { value: string }
  data: Array<{ name: string; รายรับ: number; รายจ่าย: number; กำไรสุทธิ: number }>
}

const AllBuildingCompareXAxisTick = ({ x = 0, y = 0, payload, data }: AllBuildingCompareTickProps) => {
  const entry = data.find((d) => d.name === payload?.value)
  const income = entry ? entry.รายรับ : 0
  const expense = entry ? entry.รายจ่าย : 0
  const profit = entry ? entry.กำไรสุทธิ : 0
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#666" fontSize={11}>
        {payload?.value}
      </text>
      <text x={0} y={14} dy={12} textAnchor="middle" fill={CHART_COLORS.income} fontSize={9}>
        {formatDecimalNumber(income)}
      </text>
      <text x={0} y={26} dy={12} textAnchor="middle" fill={CHART_COLORS.expense} fontSize={9}>
        {formatDecimalNumber(expense)}
      </text>
      <text x={0} y={38} dy={12} textAnchor="middle" fill={CHART_COLORS.profit} fontSize={9} fontWeight="bold">
        {formatDecimalNumber(profit)}
      </text>
    </g>
  )
}

export default function DashboardPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [timeMode, setTimeMode] = useState<string>('current') // 'current' | 'previous' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  )
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [historyData, setHistoryData] = useState<Array<{
    buildingId: number
    buildingName: string
    buildingCode: string
    month: number
    year: number
    totalIncome: number
    totalExpense: number
    grossProfit: number
    netProfit: number
    monthLabel: string
    monthYear: string
  }>>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [salarySummary, setSalarySummary] = useState<SalarySummary | null>(null)
  const [historyMonths, setHistoryMonths] = useState<string>('6') // จำนวนเดือนย้อนหลังที่แสดง
  const [historyRangeMode, setHistoryRangeMode] = useState<string>('6') // '3' | '6' | '12' | 'custom'
  const [customStartMonth, setCustomStartMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [customStartYear, setCustomStartYear] = useState<string>(String(new Date().getFullYear()))
  const [customEndMonth, setCustomEndMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [customEndYear, setCustomEndYear] = useState<string>(String(new Date().getFullYear()))

  const years = generateYears()

  // คำนวณ historyMonths จาก rangeMode
  useEffect(() => {
    if (historyRangeMode !== 'custom') {
      setHistoryMonths(historyRangeMode)
    } else {
      // คำนวณจำนวนเดือนจาก custom range
      const startDate = new Date(parseInt(customStartYear), parseInt(customStartMonth) - 1)
      const endDate = new Date(parseInt(customEndYear), parseInt(customEndMonth) - 1)
      const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1
      setHistoryMonths(String(Math.max(1, monthsDiff)))
    }
  }, [historyRangeMode, customStartMonth, customStartYear, customEndMonth, customEndYear])

  // คำนวณเดือน/ปีตาม timeMode
  useEffect(() => {
    const now = new Date()
    if (timeMode === 'current') {
      setSelectedMonth(String(now.getMonth() + 1))
      setSelectedYear(String(now.getFullYear()))
    } else if (timeMode === 'previous') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      setSelectedMonth(String(prevMonth.getMonth() + 1))
      setSelectedYear(String(prevMonth.getFullYear()))
    }
    // 'custom' - ใช้ค่าที่ผู้ใช้เลือกเอง
  }, [timeMode])

  // โหลดรายการอาคารและเงินเดือนพนักงาน
  useEffect(() => {
    Promise.all([
      fetch('/api/buildings').then((res) => res.json()),
      fetch('/api/employees/salary-summary').then((res) => res.json()),
    ])
      .then(([buildingsData, salaryData]) => {
        setBuildings(buildingsData)
        setSalarySummary(salaryData)
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
          // ถ้าเลือกอาคารเดียว ให้สร้าง structure เหมือนกัน
          setSummaryData({
            buildings: [data],
            total: data,
          })
        } else {
          setSummaryData(data)
        }
      })
      .catch((err) => console.error('Error loading summary:', err))
      .finally(() => setLoading(false))
  }, [selectedBuilding, selectedMonth, selectedYear])

  // โหลดข้อมูลย้อนหลังเมื่อเลือกอาคารเดียว
  useEffect(() => {
    if (selectedBuilding === 'all') {
      setHistoryData([])
      return
    }

    setLoadingHistory(true)

    // สร้าง URL parameters
    let url = `/api/summary/history?buildingId=${selectedBuilding}`
    if (historyRangeMode === 'custom') {
      url += `&startMonth=${customStartMonth}&startYear=${customStartYear}&endMonth=${customEndMonth}&endYear=${customEndYear}`
    } else {
      // ใช้ historyRangeMode โดยตรง เพื่อหลีกเลี่ยง race condition กับ historyMonths
      url += `&months=${historyRangeMode}`
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setHistoryData(data)
      })
      .catch((err) => console.error('Error loading history:', err))
      .finally(() => setLoadingHistory(false))
  }, [selectedBuilding, historyRangeMode, customStartMonth, customStartYear, customEndMonth, customEndYear])

  const currentSummary = summaryData?.total

  // เตรียมข้อมูลสำหรับกราฟแท่ง (เปรียบเทียบอาคาร)
  const barChartData =
    selectedBuilding === 'all' && summaryData?.buildings
      ? summaryData.buildings.map((b) => ({
          name: b.buildingCode || b.buildingName.split(' - ')[1] || b.buildingName,
          รายรับ: b.totalIncome,
          รายจ่าย: b.totalExpense,
          กำไรสุทธิ: b.netProfit,
        }))
      : []

  // เตรียมข้อมูลสำหรับกราฟแท่งอาคารเดียว (ย้อนหลังหลายเดือน)
  const historyCompareData = historyData.map((h) => ({
    name: h.monthLabel,
    รายรับ: h.totalIncome,
    รายจ่าย: h.totalExpense,
    กำไรสุทธิ: h.netProfit,
  }))

  const historyProfitData = historyData.map((h) => ({
    name: h.monthLabel,
    กำไรสุทธิ: h.netProfit,
  }))

  const historyIncomeData = historyData.map((h) => ({
    name: h.monthLabel,
    รายรับ: h.totalIncome,
  }))

  const historyExpenseData = historyData.map((h) => ({
    name: h.monthLabel,
    รายจ่าย: h.totalExpense,
  }))

  // เตรียมข้อมูลสำหรับกราฟวงกลม (รายรับแต่ละช่องทาง)
  const pieChartData = currentSummary?.incomeByChannel
    ? Object.entries(currentSummary.incomeByChannel)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
          name: name.replace('ค่าเช่าจาก ', ''),
          value,
        }))
    : []

  // เตรียมข้อมูลสำหรับกราฟวงกลมค่าใช้จ่าย
  const expensePieData = currentSummary?.expenseByCategory
    ? Object.entries(currentSummary.expenseByCategory)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value,
        }))
    : []

  const EXPENSE_COLORS = ['#F28482', '#E8837B', '#F6BD60', '#84A59D', '#5B8A7D', '#D4A24C', '#6B7280', '#9CA3AF']

  // เตรียมข้อมูลกราฟแท่งรายรับแต่ละอาคาร (ทุกอาคาร)
  const buildingIncomeBarData = selectedBuilding === 'all' && summaryData?.buildings
    ? summaryData.buildings.map((b) => ({
        name: b.buildingCode || b.buildingName.split(' - ')[1] || b.buildingName,
        รายรับ: b.totalIncome,
      }))
    : []

  // เตรียมข้อมูลกราฟแท่งรายจ่ายแต่ละอาคาร (ทุกอาคาร)
  const buildingExpenseBarData = selectedBuilding === 'all' && summaryData?.buildings
    ? summaryData.buildings.map((b) => ({
        name: b.buildingCode || b.buildingName.split(' - ')[1] || b.buildingName,
        รายจ่าย: b.totalExpense,
      }))
    : []

  // เตรียมข้อมูลกราฟแท่งกำไรแต่ละอาคาร (ทุกอาคาร)
  const buildingProfitBarData = selectedBuilding === 'all' && summaryData?.buildings
    ? summaryData.buildings.map((b) => ({
        name: b.buildingCode || b.buildingName.split(' - ')[1] || b.buildingName,
        กำไรสุทธิ: b.netProfit,
      }))
    : []


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Dashboard</h1>
          <p className="text-sm text-slate-500 md:text-base">
            สรุปรายรับ-รายจ่ายประจำเดือน {getMonthName(parseInt(selectedMonth))}{' '}
            {selectedYear}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="w-full bg-white sm:w-[200px]">
              <SelectValue placeholder="เลือกอาคาร" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกอาคาร</SelectItem>
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

          <div className="flex flex-1 gap-2 sm:flex-none">
            {/* ตัวเลือกช่วงเวลา */}
            <Select value={timeMode} onValueChange={setTimeMode}>
              <SelectTrigger className="w-full bg-white sm:w-[140px]">
                <SelectValue placeholder="ช่วงเวลา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">เดือนนี้</SelectItem>
                <SelectItem value="previous">เดือนที่แล้ว</SelectItem>
                <SelectItem value="custom">เลือกเอง</SelectItem>
              </SelectContent>
            </Select>

            {/* แสดง dropdown เดือน/ปี เฉพาะเมื่อเลือก custom */}
            {timeMode === 'custom' && (
              <>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full bg-white sm:w-[120px]">
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

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[90px] bg-white">
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
              </>
            )}

          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
          {/* ===== ส่วนที่ 1: สรุปผลประกอบการ ===== */}
          <div className="rounded-xl bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-8 w-1 rounded-full bg-[#84A59D]"></div>
              <h2 className="text-lg font-semibold text-slate-800">
                สรุปผลประกอบการ - {getMonthName(parseInt(selectedMonth))} {selectedYear}
              </h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <Card className="border-0 bg-gradient-to-br from-[#84A59D] to-[#6b8a84] text-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  รวมรายได้
                </CardTitle>
                <div className="rounded-full bg-white/20 p-1.5">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(currentSummary?.totalIncome || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-[#F28482] to-[#d96f6d] text-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  รวมค่าใช้จ่าย
                </CardTitle>
                <div className="rounded-full bg-white/20 p-1.5">
                  <TrendingDown className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(currentSummary?.totalExpense || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-[#5B9BD5] to-[#4a86c7] text-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Gross Profit
                </CardTitle>
                <div className="rounded-full bg-white/20 p-1.5">
                  <Calculator className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(currentSummary?.grossProfit || 0)}
                </div>
                <p className="text-[10px] text-white/70 mt-1">
                  = รวมรายได้ - รวมค่าใช้จ่าย
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-[#F6BD60] to-[#e5a84a] text-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Net Profit (Owner)
                </CardTitle>
                <div className="rounded-full bg-white/20 p-1.5">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(currentSummary?.netProfit || 0)}
                </div>
                <p className="text-[10px] text-white/70 mt-1">
                  = Gross Profit - Management Fee - VAT - Little Hotelier
                </p>
              </CardContent>
            </Card>
            </div>

            {/* Additional Summary Cards */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
            <Card className="border-l-4 border-l-[#F6BD60] bg-gradient-to-r from-[#F6BD60]/10 to-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Management Fee ({currentSummary?.managementFeePercent || 13.5}%)
                </CardTitle>
                <div className="rounded-full bg-[#F6BD60]/20 p-1.5">
                  <Receipt className="h-4 w-4 text-[#D4A24C]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#D4A24C]">
                  {formatNumber(currentSummary?.managementFee || 0)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  = รายได้ค่าเช่า × {currentSummary?.managementFeePercent || 13.5}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#F6BD60] bg-gradient-to-r from-[#F6BD60]/10 to-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Amount to be Paid (รวม VAT)
                </CardTitle>
                <div className="rounded-full bg-[#F6BD60]/20 p-1.5">
                  <Building2 className="h-4 w-4 text-[#D4A24C]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#D4A24C]">
                  {formatNumber(currentSummary?.amountToBePaid || 0)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  = Management Fee + VAT {currentSummary?.vatPercent || 7}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#F28482] bg-gradient-to-r from-[#F28482]/10 to-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  ค่าเช่าอาคาร
                </CardTitle>
                <div className="rounded-full bg-[#F28482]/20 p-1.5">
                  <Building2 className="h-4 w-4 text-[#F28482]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#d96f6d]">
                  {formatNumber(currentSummary?.monthlyRent || 0)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#84A59D] bg-gradient-to-r from-[#84A59D]/10 to-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  เงินเดือนพนักงาน
                </CardTitle>
                <div className="rounded-full bg-[#84A59D]/20 p-1.5">
                  <Users className="h-4 w-4 text-[#84A59D]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-[#84A59D]">
                  {formatNumber(
                    selectedBuilding === 'all'
                      ? salarySummary?.totalSalary || 0
                      : salarySummary?.salaryPerBuilding || 0
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedBuilding === 'all'
                    ? `(รวมทั้งหมด / ${salarySummary?.buildingCount || 0} อาคาร)`
                    : `(${formatNumber(salarySummary?.totalSalary || 0)} ÷ ${salarySummary?.buildingCount || 0} อาคาร)`
                  }
                </p>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* ===== ส่วนที่ 2: กราฟวิเคราะห์ ===== */}
          <div className="rounded-xl bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 rounded-full bg-[#F6BD60]"></div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {selectedBuilding === 'all'
                    ? 'เปรียบเทียบอาคาร'
                    : historyRangeMode === 'custom'
                      ? `กราฟย้อนหลัง ${getMonthName(parseInt(customStartMonth))} ${customStartYear} - ${getMonthName(parseInt(customEndMonth))} ${customEndYear}`
                      : `กราฟย้อนหลัง ${historyMonths} เดือน`
                  }
                </h2>
              </div>
              {/* เลือกช่วงเวลากราฟย้อนหลัง - แสดงเฉพาะเมื่อเลือกอาคารเดียว */}
              {selectedBuilding !== 'all' && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Radio-style buttons */}
                  <div className="flex rounded-lg border border-[#F6BD60]/30 bg-[#F6BD60]/5 p-1">
                    {['3', '6', '12'].map((val) => (
                      <button
                        key={val}
                        onClick={() => setHistoryRangeMode(val)}
                        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                          historyRangeMode === val
                            ? 'bg-[#F6BD60] text-white'
                            : 'text-slate-600 hover:bg-[#F6BD60]/20'
                        }`}
                      >
                        {val} เดือน
                      </button>
                    ))}
                    <button
                      onClick={() => setHistoryRangeMode('custom')}
                      className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                        historyRangeMode === 'custom'
                          ? 'bg-[#F6BD60] text-white'
                          : 'text-slate-600 hover:bg-[#F6BD60]/20'
                      }`}
                    >
                      เลือกเอง
                    </button>
                  </div>
                  {/* Custom range selectors */}
                  {historyRangeMode === 'custom' && (
                    <div className="flex items-center gap-1 text-sm">
                      <Select value={customStartMonth} onValueChange={setCustomStartMonth}>
                        <SelectTrigger className="w-[90px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={customStartYear} onValueChange={setCustomStartYear}>
                        <SelectTrigger className="w-[70px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-slate-500">ถึง</span>
                      <Select value={customEndMonth} onValueChange={setCustomEndMonth}>
                        <SelectTrigger className="w-[90px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={customEndYear} onValueChange={setCustomEndYear}>
                        <SelectTrigger className="w-[70px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            {/* Bar Chart - เปรียบเทียบอาคาร (ทุกอาคาร) */}
            {selectedBuilding === 'all' && barChartData.length > 0 && (
              <Card className="border-t-4 border-t-[#84A59D] bg-gradient-to-b from-[#84A59D]/5 to-white">
                <CardHeader>
                  <CardTitle className="text-[#84A59D]">เปรียบเทียบผลประกอบการ</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={(props) => <AllBuildingCompareXAxisTick {...props} data={barChartData} />}
                        height={70}
                      />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => formatNumber(value)}
                      />
                      <Legend />
                      <Bar dataKey="รายรับ" fill="#5B8A7D" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="รายจ่าย" fill="#E8837B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="กำไรสุทธิ" fill="#D4A24C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Bar Chart - เปรียบเทียบผลประกอบการย้อนหลัง (อาคารเดียว) */}
            {selectedBuilding !== 'all' && historyCompareData.length > 0 && (
              <Card className="border-t-4 border-t-[#84A59D] bg-gradient-to-b from-[#84A59D]/5 to-white">
                <CardHeader>
                  <CardTitle className="text-[#84A59D]">เปรียบเทียบผลประกอบการย้อนหลัง {historyMonths} เดือน</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={historyCompareData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          tick={(props) => <CustomCompareXAxisTick {...props} data={historyCompareData} />}
                          height={70}
                        />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: number) => formatNumber(value)}
                        />
                        <Legend />
                        <Bar dataKey="รายรับ" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="รายจ่าย" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="กำไรสุทธิ" fill={CHART_COLORS.profit} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bar Chart - กำไรสุทธิแต่ละอาคาร (ทุกอาคาร) */}
            {selectedBuilding === 'all' && buildingProfitBarData.length > 0 && (
              <Card className="border-t-4 border-t-[#F6BD60] bg-gradient-to-b from-[#F6BD60]/5 to-white">
                <CardHeader>
                  <CardTitle className="text-[#D4A24C]">สัดส่วนกำไรสุทธิแต่ละอาคาร</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={buildingProfitBarData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={(props) => <AllBuildingXAxisTick {...props} data={buildingProfitBarData} dataKey="กำไรสุทธิ" color={CHART_COLORS.profit} />}
                        height={50}
                      />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => formatNumber(value)}
                      />
                      <Bar dataKey="กำไรสุทธิ" radius={[4, 4, 0, 0]}>
                        {buildingProfitBarData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={BUILDING_COLORS_ARRAY[index % BUILDING_COLORS_ARRAY.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Bar Chart - กำไรสุทธิย้อนหลัง (อาคารเดียว) */}
            {selectedBuilding !== 'all' && historyProfitData.length > 0 && (
              <Card className="border-t-4 border-t-[#F6BD60] bg-gradient-to-b from-[#F6BD60]/5 to-white">
                <CardHeader>
                  <CardTitle className="text-[#D4A24C]">กำไรสุทธิย้อนหลัง {historyMonths} เดือน</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={historyProfitData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          tick={(props) => <CustomXAxisTick {...props} data={historyProfitData} dataKey="กำไรสุทธิ" color={CHART_COLORS.profit} />}
                          height={50}
                        />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: number) => formatNumber(value)}
                        />
                        <Bar dataKey="กำไรสุทธิ" fill={CHART_COLORS.profit} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bar Chart - รายรับแต่ละอาคาร (ทุกอาคาร) */}
            {selectedBuilding === 'all' && buildingIncomeBarData.length > 0 && (
              <Card className="border-t-4 border-t-[#84A59D] bg-gradient-to-b from-[#84A59D]/5 to-white">
                <CardHeader>
                  <CardTitle className="text-[#84A59D]">สัดส่วนรายรับแต่ละอาคาร</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={buildingIncomeBarData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={(props) => <AllBuildingXAxisTick {...props} data={buildingIncomeBarData} dataKey="รายรับ" color={CHART_COLORS.income} />}
                        height={50}
                      />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => formatNumber(value)}
                      />
                      <Bar dataKey="รายรับ" radius={[4, 4, 0, 0]}>
                        {buildingIncomeBarData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={BUILDING_COLORS_ARRAY[index % BUILDING_COLORS_ARRAY.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Bar Chart - รายรับย้อนหลัง (อาคารเดียว) */}
            {selectedBuilding !== 'all' && historyIncomeData.length > 0 && (
              <Card className="border-t-4 border-t-[#84A59D] bg-gradient-to-b from-[#84A59D]/5 to-white">
                <CardHeader>
                  <CardTitle className="text-[#84A59D]">รายรับย้อนหลัง {historyMonths} เดือน</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={historyIncomeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          tick={(props) => <CustomXAxisTick {...props} data={historyIncomeData} dataKey="รายรับ" color={CHART_COLORS.income} />}
                          height={50}
                        />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: number) => formatNumber(value)}
                        />
                        <Bar dataKey="รายรับ" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bar Chart - รายจ่ายแต่ละอาคาร (ทุกอาคาร) */}
            {selectedBuilding === 'all' && buildingExpenseBarData.length > 0 && (
              <Card className="border-t-4 border-t-[#F28482] bg-gradient-to-b from-[#F28482]/5 to-white">
                <CardHeader>
                  <CardTitle className="text-[#F28482]">สัดส่วนรายจ่ายแต่ละอาคาร</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={buildingExpenseBarData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={(props) => <AllBuildingXAxisTick {...props} data={buildingExpenseBarData} dataKey="รายจ่าย" color={CHART_COLORS.expense} />}
                        height={50}
                      />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => formatNumber(value)}
                      />
                      <Bar dataKey="รายจ่าย" radius={[4, 4, 0, 0]}>
                        {buildingExpenseBarData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={BUILDING_COLORS_ARRAY[index % BUILDING_COLORS_ARRAY.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Bar Chart - รายจ่ายย้อนหลัง (อาคารเดียว) */}
            {selectedBuilding !== 'all' && historyExpenseData.length > 0 && (
              <Card className="border-t-4 border-t-[#F28482] bg-gradient-to-b from-[#F28482]/5 to-white">
                <CardHeader>
                  <CardTitle className="text-[#F28482]">รายจ่ายย้อนหลัง {historyMonths} เดือน</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="flex h-[300px] items-center justify-center">
                      <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={historyExpenseData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          tick={(props) => <CustomXAxisTick {...props} data={historyExpenseData} dataKey="รายจ่าย" color={CHART_COLORS.expense} />}
                          height={50}
                        />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: number) => formatNumber(value)}
                        />
                        <Bar dataKey="รายจ่าย" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
