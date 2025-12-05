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
import { FileDown, FileSpreadsheet, Loader2, Printer, Building2, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// เพิ่ม type สำหรับ jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: object) => jsPDF
  }
}

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
  const [exporting, setExporting] = useState(false)
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

  // Export to Excel - Single Building
  const handleExportExcel = async (data: Summary, buildingName: string) => {
    setExporting(true)
    try {
      const incomeData = Object.entries(data.incomeByChannel || {}).map(
        ([name, amount], index) => ({
          ลำดับ: index + 1,
          รายการ: name,
          จำนวนเงิน: amount,
        })
      )

      const expenseData = Object.entries(data.expenseByCategory || {}).map(
        ([name, amount], index) => ({
          ลำดับ: index + 1,
          รายการ: name,
          จำนวนเงิน: amount,
        })
      )

      const summarySheet = [
        ['สรุปรายรับ-รายจ่าย'],
        [`อาคาร: ${buildingName}`],
        [`เดือน: ${getMonthName(parseInt(selectedMonth))} ${selectedYear}`],
        [],
        ['รายการ', 'จำนวนเงิน (บาท)'],
        ['รวมรายได้ค่าเช่า', data.totalIncome],
        ['รวมค่าใช้จ่าย', data.totalExpense],
        ['Gross Profit', data.grossProfit],
        [`Management Fee (${data.managementFeePercent}%)`, data.managementFee],
        ['ค่าเช่าอาคาร/เดือน', data.monthlyRent],
        ['Net Profit for Owner', data.netProfit],
        [`Amount to be Paid (รวม VAT ${data.vatPercent}%)`, data.amountToBePaid],
      ]

      const wb = XLSX.utils.book_new()
      const wsSummary = XLSX.utils.aoa_to_sheet(summarySheet)
      XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุป')

      if (incomeData.length > 0) {
        const wsIncome = XLSX.utils.json_to_sheet(incomeData)
        XLSX.utils.book_append_sheet(wb, wsIncome, 'รายรับ')
      }

      if (expenseData.length > 0) {
        const wsExpense = XLSX.utils.json_to_sheet(expenseData)
        XLSX.utils.book_append_sheet(wb, wsExpense, 'รายจ่าย')
      }

      const fileName = `ASW_Report_${buildingName.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (err) {
      console.error('Error exporting Excel:', err)
      alert('เกิดข้อผิดพลาดในการส่งออก Excel')
    } finally {
      setExporting(false)
    }
  }

  // Export All Buildings to Excel
  const handleExportAllExcel = async () => {
    if (!allSummaryData) return

    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()

      // สร้าง sheet สำหรับแต่ละอาคาร
      for (const building of allSummaryData.buildings) {
        const sheetData = [
          [`${building.buildingName}`],
          [`เดือน: ${getMonthName(parseInt(selectedMonth))} ${selectedYear}`],
          [],
          ['รายการ', 'จำนวนเงิน (บาท)'],
          ['รวมรายได้ค่าเช่า', building.totalIncome],
          ['รวมค่าใช้จ่าย', building.totalExpense],
          ['Gross Profit', building.grossProfit],
          [`Management Fee (${building.managementFeePercent}%)`, building.managementFee],
          ['ค่าเช่าอาคาร/เดือน', building.monthlyRent],
          ['Net Profit for Owner', building.netProfit],
          [`Amount to be Paid (รวม VAT ${building.vatPercent}%)`, building.amountToBePaid],
        ]

        const ws = XLSX.utils.aoa_to_sheet(sheetData)
        const sheetName = building.buildingCode || building.buildingName.substring(0, 20)
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      }

      // สร้าง sheet สรุปรวม
      const totalSheet = [
        ['สรุปรวมทุกอาคาร'],
        [`เดือน: ${getMonthName(parseInt(selectedMonth))} ${selectedYear}`],
        [],
        ['รายการ', 'จำนวนเงิน (บาท)'],
        ['รวมรายได้ค่าเช่า', allSummaryData.total.totalIncome],
        ['รวมค่าใช้จ่าย', allSummaryData.total.totalExpense],
        ['Gross Profit', allSummaryData.total.grossProfit],
        ['Management Fee', allSummaryData.total.managementFee],
        ['ค่าเช่าอาคาร/เดือน', allSummaryData.total.monthlyRent],
        ['Net Profit for Owner', allSummaryData.total.netProfit],
        ['Amount to be Paid (รวม VAT)', allSummaryData.total.amountToBePaid],
      ]
      const wsTotal = XLSX.utils.aoa_to_sheet(totalSheet)
      XLSX.utils.book_append_sheet(wb, wsTotal, 'สรุปรวม')

      const fileName = `ASW_Report_AllBuildings_${selectedMonth}_${selectedYear}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (err) {
      console.error('Error exporting Excel:', err)
      alert('เกิดข้อผิดพลาดในการส่งออก Excel')
    } finally {
      setExporting(false)
    }
  }

  // Export to PDF - Single Building
  const handleExportPDF = async (data: Summary, buildingName: string) => {
    setExportingPDF(true)
    try {
      const doc = new jsPDF()

      // เพิ่มฟอนต์ไทย (ใช้ฟอนต์ที่รองรับ)
      doc.setFont('helvetica')

      // หัวเรื่อง
      doc.setFontSize(18)
      doc.text('Report Summary', 105, 20, { align: 'center' })

      doc.setFontSize(12)
      doc.text(`Building: ${buildingName}`, 105, 30, { align: 'center' })
      doc.text(`Month: ${getMonthName(parseInt(selectedMonth))} ${selectedYear}`, 105, 38, { align: 'center' })

      // ตารางสรุป
      const tableData = [
        ['Total Rental Income', formatNumber(data.totalIncome) + ' Baht'],
        ['Total Expenses', formatNumber(data.totalExpense) + ' Baht'],
        ['Gross Profit', formatNumber(data.grossProfit) + ' Baht'],
        [`Management Fee (${data.managementFeePercent}%)`, formatNumber(data.managementFee) + ' Baht'],
        ['Monthly Rent', formatNumber(data.monthlyRent) + ' Baht'],
        ['Net Profit for Owner', formatNumber(data.netProfit) + ' Baht'],
        [`Amount to be Paid (VAT ${data.vatPercent}%)`, formatNumber(data.amountToBePaid) + ' Baht'],
      ]

      doc.autoTable({
        startY: 50,
        head: [['Item', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [132, 165, 157] },
        styles: { fontSize: 10 },
      })

      const fileName = `ASW_Report_${buildingName.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.pdf`
      doc.save(fileName)
    } catch (err) {
      console.error('Error exporting PDF:', err)
      alert('เกิดข้อผิดพลาดในการส่งออก PDF')
    } finally {
      setExportingPDF(false)
    }
  }

  // Export All Buildings to PDF
  const handleExportAllPDF = async () => {
    if (!allSummaryData) return

    setExportingPDF(true)
    try {
      const doc = new jsPDF()

      doc.setFont('helvetica')

      // หน้าแรก - หัวเรื่อง
      doc.setFontSize(20)
      doc.text('Monthly Report - All Buildings', 105, 30, { align: 'center' })
      doc.setFontSize(14)
      doc.text(`${getMonthName(parseInt(selectedMonth))} ${selectedYear}`, 105, 42, { align: 'center' })

      let yPosition = 60

      // แต่ละอาคาร
      for (let i = 0; i < allSummaryData.buildings.length; i++) {
        const building = allSummaryData.buildings[i]

        // ตรวจสอบว่าต้องขึ้นหน้าใหม่หรือไม่
        if (yPosition > 200) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(14)
        doc.setTextColor(132, 165, 157)
        doc.text(building.buildingName, 14, yPosition)
        doc.setTextColor(0, 0, 0)

        const tableData = [
          ['Total Rental Income', formatNumber(building.totalIncome) + ' Baht'],
          ['Total Expenses', formatNumber(building.totalExpense) + ' Baht'],
          ['Gross Profit', formatNumber(building.grossProfit) + ' Baht'],
          [`Management Fee (${building.managementFeePercent}%)`, formatNumber(building.managementFee) + ' Baht'],
          ['Monthly Rent', formatNumber(building.monthlyRent) + ' Baht'],
          ['Net Profit for Owner', formatNumber(building.netProfit) + ' Baht'],
          [`Amount to be Paid (VAT ${building.vatPercent}%)`, formatNumber(building.amountToBePaid) + ' Baht'],
        ]

        doc.autoTable({
          startY: yPosition + 5,
          head: [['Item', 'Amount']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [132, 165, 157], fontSize: 9 },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        })

        // @ts-ignore - autoTable เพิ่ม property นี้
        yPosition = doc.lastAutoTable.finalY + 15
      }

      // หน้าสรุปรวม
      doc.addPage()
      doc.setFontSize(16)
      doc.setTextColor(132, 165, 157)
      doc.text('Total Summary - All Buildings', 105, 20, { align: 'center' })
      doc.setTextColor(0, 0, 0)

      const totalTableData = [
        ['Total Rental Income', formatNumber(allSummaryData.total.totalIncome) + ' Baht'],
        ['Total Expenses', formatNumber(allSummaryData.total.totalExpense) + ' Baht'],
        ['Gross Profit', formatNumber(allSummaryData.total.grossProfit) + ' Baht'],
        ['Management Fee', formatNumber(allSummaryData.total.managementFee) + ' Baht'],
        ['Monthly Rent', formatNumber(allSummaryData.total.monthlyRent) + ' Baht'],
        ['Net Profit for Owner', formatNumber(allSummaryData.total.netProfit) + ' Baht'],
        ['Amount to be Paid (VAT)', formatNumber(allSummaryData.total.amountToBePaid) + ' Baht'],
      ]

      doc.autoTable({
        startY: 30,
        head: [['Item', 'Amount']],
        body: totalTableData,
        theme: 'striped',
        headStyles: { fillColor: [132, 165, 157] },
        styles: { fontSize: 11 },
      })

      const fileName = `ASW_Report_AllBuildings_${selectedMonth}_${selectedYear}.pdf`
      doc.save(fileName)
    } catch (err) {
      console.error('Error exporting PDF:', err)
      alert('เกิดข้อผิดพลาดในการส่งออก PDF')
    } finally {
      setExportingPDF(false)
    }
  }

  // Print
  const handlePrint = () => {
    window.print()
  }

  // Render Summary Table
  const renderSummaryTable = (data: Summary, showTitle: boolean = true) => (
    <div className="overflow-hidden rounded-lg border border-[#E8DED5] print:border-gray-300">
      {showTitle && (
        <div className="bg-[#84A59D] px-4 py-2 text-white print:bg-gray-700">
          <h3 className="font-bold">{data.buildingName}</h3>
        </div>
      )}
      <table className="w-full">
        <tbody>
          <tr className="bg-[#84A59D]/10 print:bg-gray-100">
            <td className="px-4 py-2 font-medium">รวมรายได้ค่าเช่า</td>
            <td className="px-4 py-2 text-right font-bold text-[#84A59D] print:text-gray-800">
              {formatNumber(data.totalIncome)} บาท
            </td>
          </tr>
          <tr>
            <td className="px-4 py-2 font-medium">รวมค่าใช้จ่าย</td>
            <td className="px-4 py-2 text-right font-bold text-[#F28482] print:text-gray-800">
              {formatNumber(data.totalExpense)} บาท
            </td>
          </tr>
          <tr className="bg-[#F6BD60]/10 print:bg-gray-50">
            <td className="px-4 py-2 font-medium">Gross Profit</td>
            <td className="px-4 py-2 text-right font-bold">
              {formatNumber(data.grossProfit)} บาท
            </td>
          </tr>
          <tr>
            <td className="px-4 py-2 font-medium">
              Management Fee ({data.managementFeePercent}%)
            </td>
            <td className="px-4 py-2 text-right">
              {formatNumber(data.managementFee)} บาท
            </td>
          </tr>
          <tr>
            <td className="px-4 py-2 font-medium">ค่าเช่าอาคาร/เดือน</td>
            <td className="px-4 py-2 text-right">
              {formatNumber(data.monthlyRent)} บาท
            </td>
          </tr>
          <tr className="bg-[#84A59D]/20 print:bg-gray-200">
            <td className="px-4 py-2 font-bold">Net Profit for Owner</td>
            <td className="px-4 py-2 text-right font-bold text-[#84A59D] print:text-gray-800">
              {formatNumber(data.netProfit)} บาท
            </td>
          </tr>
          <tr className="bg-[#F5CAC3]/30 print:bg-gray-100">
            <td className="px-4 py-2 font-bold">
              Amount to be Paid (รวม VAT {data.vatPercent}%)
            </td>
            <td className="px-4 py-2 text-right font-bold">
              {formatNumber(data.amountToBePaid)} บาท
            </td>
          </tr>
        </tbody>
      </table>
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

      {/* Print Header - แสดงเฉพาะตอนพิมพ์ */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-center">รายงานสรุปรายรับ-รายจ่าย</h1>
        <p className="text-center text-gray-600">
          {selectedBuildingName} - {getMonthName(parseInt(selectedMonth))} {selectedYear}
        </p>
        <p className="text-center text-sm text-gray-500 mt-1">
          พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-32 items-center justify-center print:hidden">
          <Loader2 className="h-8 w-8 animate-spin text-[#84A59D]" />
        </div>
      ) : selectedBuilding === 'all' && allSummaryData ? (
        // แสดงทุกอาคาร
        <div className="space-y-6">
          {/* แต่ละอาคาร */}
          {allSummaryData.buildings.map((building) => (
            <Card key={building.buildingId} className="border-0 shadow-md print:shadow-none print:border print:border-gray-300">
              <CardContent className="p-0">
                {renderSummaryTable(building, true)}

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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportExcel(building, building.buildingName)}
                    disabled={exporting}
                    className="border-[#84A59D] text-[#84A59D] hover:bg-[#84A59D]/10"
                  >
                    <FileSpreadsheet className="mr-1 h-4 w-4" />
                    Excel
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
              onClick={handlePrint}
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
              ดาวน์โหลด PDF ทั้งหมด
            </Button>
            <Button
              onClick={handleExportAllExcel}
              disabled={exporting}
              className="bg-[#84A59D] hover:bg-[#6b8a84]"
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              ดาวน์โหลด Excel ทั้งหมด
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
                onClick={handlePrint}
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
              <Button
                onClick={() => handleExportExcel(summaryData, selectedBuildingName)}
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
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}
