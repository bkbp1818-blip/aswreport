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
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

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
  littleHotelierExpense: number
  monthlyRent: number
  netProfit: number
  amountToBePaid: number
  incomeByChannel: Record<string, number>
  expenseByCategory: Record<string, number>
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
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

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
        } else {
          setSummaryData(data.total)
        }
      })
      .catch((err) => console.error('Error loading summary:', err))
      .finally(() => setLoading(false))
  }, [selectedBuilding, selectedMonth, selectedYear])

  const selectedBuildingName =
    selectedBuilding === 'all'
      ? 'ทุกอาคาร'
      : buildings.find((b) => String(b.id) === selectedBuilding)?.name || ''

  // Export to Excel
  const handleExportExcel = async () => {
    if (!summaryData) return

    setExporting(true)
    try {
      // สร้างข้อมูลสำหรับ Excel
      const incomeData = Object.entries(summaryData.incomeByChannel || {}).map(
        ([name, amount], index) => ({
          ลำดับ: index + 1,
          รายการ: name,
          จำนวนเงิน: amount,
        })
      )

      const expenseData = Object.entries(summaryData.expenseByCategory || {}).map(
        ([name, amount], index) => ({
          ลำดับ: index + 1,
          รายการ: name,
          จำนวนเงิน: amount,
        })
      )

      const summarySheet = [
        ['สรุปรายรับ-รายจ่าย'],
        [`อาคาร: ${selectedBuildingName}`],
        [`เดือน: ${getMonthName(parseInt(selectedMonth))} ${selectedYear}`],
        [],
        ['รายการ', 'จำนวนเงิน (บาท)'],
        ['รวมรายได้ค่าเช่า', summaryData.totalIncome],
        ['รวมค่าใช้จ่าย', summaryData.totalExpense],
        ['Gross Profit', summaryData.grossProfit],
        [`Management Fee (${summaryData.managementFeePercent}%)`, summaryData.managementFee],
        ['Little Hotelier Expense', summaryData.littleHotelierExpense],
        ['ค่าเช่าอาคาร/เดือน', summaryData.monthlyRent],
        ['Net Profit for Owner', summaryData.netProfit],
        [`Amount to be Paid (รวม VAT ${summaryData.vatPercent}%)`, summaryData.amountToBePaid],
      ]

      // สร้าง workbook
      const wb = XLSX.utils.book_new()

      // เพิ่ม sheet สรุป
      const wsSummary = XLSX.utils.aoa_to_sheet(summarySheet)
      XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุป')

      // เพิ่ม sheet รายรับ
      if (incomeData.length > 0) {
        const wsIncome = XLSX.utils.json_to_sheet(incomeData)
        XLSX.utils.book_append_sheet(wb, wsIncome, 'รายรับ')
      }

      // เพิ่ม sheet รายจ่าย
      if (expenseData.length > 0) {
        const wsExpense = XLSX.utils.json_to_sheet(expenseData)
        XLSX.utils.book_append_sheet(wb, wsExpense, 'รายจ่าย')
      }

      // ดาวน์โหลดไฟล์
      const fileName = `ASW_Report_${selectedBuildingName}_${selectedMonth}_${selectedYear}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (err) {
      console.error('Error exporting Excel:', err)
      alert('เกิดข้อผิดพลาดในการส่งออก Excel')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#333]">ดาวน์โหลดรายงาน</h1>
        <p className="text-[#666]">
          ส่งออกรายงานรายรับ-รายจ่ายเป็นไฟล์ Excel
        </p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
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
                <SelectTrigger className="w-[250px] bg-white">
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

      {/* Preview */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-[#666]">กำลังโหลดข้อมูล...</p>
        </div>
      ) : summaryData ? (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>
              ตัวอย่างรายงาน: {selectedBuildingName}
            </CardTitle>
            <CardDescription>
              {getMonthName(parseInt(selectedMonth))} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Table */}
              <div className="overflow-hidden rounded-lg border border-[#E8DED5]">
                <table className="w-full">
                  <tbody>
                    <tr className="bg-[#84A59D]/10">
                      <td className="px-4 py-2 font-medium">รวมรายได้ค่าเช่า</td>
                      <td className="px-4 py-2 text-right font-bold text-[#84A59D]">
                        {formatNumber(summaryData.totalIncome)} บาท
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">รวมค่าใช้จ่าย</td>
                      <td className="px-4 py-2 text-right font-bold text-[#F28482]">
                        {formatNumber(summaryData.totalExpense)} บาท
                      </td>
                    </tr>
                    <tr className="bg-[#F6BD60]/10">
                      <td className="px-4 py-2 font-medium">Gross Profit</td>
                      <td className="px-4 py-2 text-right font-bold">
                        {formatNumber(summaryData.grossProfit)} บาท
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">
                        Management Fee ({summaryData.managementFeePercent}%)
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatNumber(summaryData.managementFee)} บาท
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Little Hotelier</td>
                      <td className="px-4 py-2 text-right">
                        {formatNumber(summaryData.littleHotelierExpense)} บาท
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">ค่าเช่าอาคาร/เดือน</td>
                      <td className="px-4 py-2 text-right">
                        {formatNumber(summaryData.monthlyRent)} บาท
                      </td>
                    </tr>
                    <tr className="bg-[#84A59D]/20">
                      <td className="px-4 py-2 font-bold">Net Profit for Owner</td>
                      <td className="px-4 py-2 text-right font-bold text-[#84A59D]">
                        {formatNumber(summaryData.netProfit)} บาท
                      </td>
                    </tr>
                    <tr className="bg-[#F5CAC3]/30">
                      <td className="px-4 py-2 font-bold">
                        Amount to be Paid (รวม VAT)
                      </td>
                      <td className="px-4 py-2 text-right font-bold">
                        {formatNumber(summaryData.amountToBePaid)} บาท
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Export Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="bg-[#84A59D] hover:bg-[#6b8a84]"
                >
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                  )}
                  ดาวน์โหลด Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <FileDown className="mx-auto h-12 w-12 text-[#84A59D]/50" />
            <p className="mt-4 text-[#666]">ไม่พบข้อมูลสำหรับช่วงเวลาที่เลือก</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
