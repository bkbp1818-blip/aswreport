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
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Calculator,
  Receipt,
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
  managementFee: number
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

const COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
]

export default function DashboardPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  )
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

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

  // เตรียมข้อมูลสำหรับกราฟวงกลม (รายรับแต่ละช่องทาง)
  const pieChartData = currentSummary?.incomeByChannel
    ? Object.entries(currentSummary.incomeByChannel)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
          name: name.replace('ค่าเช่าจาก ', ''),
          value,
        }))
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">
            สรุปรายรับ-รายจ่ายประจำเดือน {getMonthName(parseInt(selectedMonth))}{' '}
            {selectedYear}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="เลือกอาคาร" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกอาคาร</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] bg-white">
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
            <SelectTrigger className="w-[100px] bg-white">
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

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  รวมรายได้
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(currentSummary?.totalIncome || 0)}
                </div>
                <p className="text-xs text-slate-500">บาท</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  รวมค่าใช้จ่าย
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatNumber(currentSummary?.totalExpense || 0)}
                </div>
                <p className="text-xs text-slate-500">บาท</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Gross Profit
                </CardTitle>
                <Calculator className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    (currentSummary?.grossProfit || 0) >= 0
                      ? 'text-blue-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatNumber(currentSummary?.grossProfit || 0)}
                </div>
                <p className="text-xs text-slate-500">บาท</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Net Profit (Owner)
                </CardTitle>
                <Wallet className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    (currentSummary?.netProfit || 0) >= 0
                      ? 'text-purple-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatNumber(currentSummary?.netProfit || 0)}
                </div>
                <p className="text-xs text-slate-500">บาท</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Management Fee (13.5%)
                </CardTitle>
                <Receipt className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-orange-600">
                  {formatNumber(currentSummary?.managementFee || 0)}
                </div>
                <p className="text-xs text-slate-500">บาท</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Amount to be Paid (รวม VAT)
                </CardTitle>
                <Building2 className="h-4 w-4 text-cyan-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-cyan-600">
                  {formatNumber(currentSummary?.amountToBePaid || 0)}
                </div>
                <p className="text-xs text-slate-500">บาท</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  ค่าเช่าอาคาร + Little Hotelier
                </CardTitle>
                <Building2 className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-slate-600">
                  {formatNumber(
                    (currentSummary?.monthlyRent || 0) +
                      (currentSummary?.littleHotelierExpense || 0)
                  )}
                </div>
                <p className="text-xs text-slate-500">บาท</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bar Chart - เปรียบเทียบอาคาร */}
            {selectedBuilding === 'all' && barChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>เปรียบเทียบผลประกอบการ 3 อาคาร</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => formatNumber(value)}
                      />
                      <Legend />
                      <Bar dataKey="รายรับ" fill="#10B981" />
                      <Bar dataKey="รายจ่าย" fill="#EF4444" />
                      <Bar dataKey="กำไรสุทธิ" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Pie Chart - รายรับแต่ละช่องทาง */}
            {pieChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>สัดส่วนรายรับแต่ละช่องทาง</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatNumber(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Expense Breakdown Table */}
          {currentSummary?.expenseByCategory &&
            Object.keys(currentSummary.expenseByCategory).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>รายละเอียดค่าใช้จ่าย</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(currentSummary.expenseByCategory)
                      .filter(([, value]) => value > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([name, value]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2"
                        >
                          <span className="text-sm text-slate-700">{name}</span>
                          <span className="font-medium text-slate-900">
                            {formatNumber(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  )
}
