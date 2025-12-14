'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { formatNumber, MONTHS, getMonthName } from '@/lib/utils'
import { generateYears } from '@/lib/calculations'
import { CategoryIcon } from '@/lib/category-icons'
import { Loader2, Plus, Minus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { getBuildingColor } from '@/lib/building-colors'

interface Building {
  id: number
  name: string
  code: string
}

interface Category {
  id: number
  name: string
  type: 'INCOME' | 'EXPENSE'
  order: number
}

interface Transaction {
  id?: number
  buildingId: number
  categoryId: number
  amount: number
  month: number
  year: number
  note?: string
  category?: Category
}

interface SalarySummary {
  totalSalary: number
  buildingCount: number
  salaryPerBuilding: number
}

interface BuildingSettings {
  monthlyRent: number
  cowayWaterFilterExpense: number
}

interface GlobalSettings {
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
  buildingCount: number
  careExpenseDivisor: number // จำนวนอาคารที่ร่วมจ่ายค่าดูแล MAX, จราจร, ขนส่งสินค้า (3 อาคาร)
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

interface ExpenseHistoryItem {
  id: number
  targetType: string
  targetId: number | null
  fieldName: string
  fieldLabel: string
  actionType: string
  amount: string
  description: string
  month: number
  year: number
  createdAt: string
}

export default function TransactionsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  )
  const [transactionData, setTransactionData] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [salarySummary, setSalarySummary] = useState<SalarySummary | null>(null)
  const [buildingSettings, setBuildingSettings] = useState<BuildingSettings | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null)

  // State สำหรับ Dialog เพิ่ม/ลดยอด
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add')
  const [adjustCategoryId, setAdjustCategoryId] = useState<number | null>(null)
  const [adjustCategoryName, setAdjustCategoryName] = useState('')
  const [adjustAmount, setAdjustAmount] = useState<string>('')
  const [adjustDescription, setAdjustDescription] = useState<string>('')

  // State สำหรับประวัติค่าใช้จ่าย
  const [adjustMonth, setAdjustMonth] = useState<string>(String(new Date().getMonth() + 1))
  const [adjustYear, setAdjustYear] = useState<string>(String(new Date().getFullYear()))
  const [expenseHistory, setExpenseHistory] = useState<ExpenseHistoryItem[]>([])
  const [historyTotal, setHistoryTotal] = useState<number>(0)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [savingHistory, setSavingHistory] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const years = generateYears()

  // โหลดรายการอาคารและหมวดหมู่ และเงินเดือนพนักงาน และ GlobalSettings
  useEffect(() => {
    Promise.all([
      fetch('/api/buildings').then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
      fetch('/api/employees/salary-summary').then((res) => res.json()),
      fetch('/api/global-settings').then((res) => res.json()),
    ])
      .then(([buildingsData, categoriesData, salaryData, globalData]) => {
        setBuildings(buildingsData)
        setCategories(categoriesData)
        setSalarySummary(salaryData)
        setGlobalSettings(globalData)
        if (buildingsData.length > 0 && !selectedBuilding) {
          setSelectedBuilding(String(buildingsData[0].id))
        }
      })
      .catch((err) => console.error('Error loading data:', err))
      .finally(() => setLoading(false))
  }, [])

  // โหลดข้อมูล transactions และ settings เมื่อเลือกอาคาร/เดือน/ปี
  const loadTransactions = useCallback(async () => {
    if (!selectedBuilding || !selectedMonth || !selectedYear) return

    setLoading(true)
    try {
      const historyParams = new URLSearchParams({
        targetType: 'TRANSACTION',
        targetId: selectedBuilding,
        month: selectedMonth,
        year: selectedYear,
      })

      // โหลด expense history totals และ settings พร้อมกัน
      const [historyTotalsRes, settingsRes] = await Promise.all([
        fetch(`/api/expense-history/totals?${historyParams}`),
        fetch(`/api/settings?buildingId=${selectedBuilding}`)
      ])

      const historyData = await historyTotalsRes.json()
      const settings = await settingsRes.json()

      // แปลงข้อมูลจาก expense history totals เป็น Record<categoryId, amount>
      const dataMap: Record<number, number> = {}
      if (historyData.totals) {
        for (const [fieldName, amount] of Object.entries(historyData.totals)) {
          dataMap[parseInt(fieldName)] = amount as number
        }
      }
      setTransactionData(dataMap)

      // เก็บ settings ของอาคาร
      if (settings) {
        setBuildingSettings({
          monthlyRent: Number(settings.monthlyRent) || 0,
          cowayWaterFilterExpense: Number(settings.cowayWaterFilterExpense) || 0,
        })
      } else {
        setBuildingSettings(null)
      }
    } catch (err) {
      console.error('Error loading transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedBuilding, selectedMonth, selectedYear])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  // แยกหมวดหมู่ตามประเภท
  const incomeCategories = categories.filter((c) => c.type === 'INCOME')
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  // แยกรายได้เป็น 2 กลุ่ม: ค่าเช่า และ รายได้อื่นๆ
  const rentalIncomeCategories = incomeCategories.filter((c) => c.name.includes('ค่าเช่า'))
  const otherIncomeCategories = incomeCategories.filter((c) => !c.name.includes('ค่าเช่า'))

  // หา categoryId ของเงินเดือนพนักงาน
  const salaryCategory = categories.find((c) => c.name === 'เงินเดือนพนักงาน')
  const salaryCategoryId = salaryCategory?.id

  // รายการค่าใช้จ่ายที่จัดการใน GlobalSettings แล้ว (ไม่ต้องแสดงซ้ำ)
  const globalSettingsCategoryNames = [
    'ค่าดูแล MAX',
    'ค่าดูแลจราจร',
    'ค่าขนส่งสินค้า',
    'ค่า Amenity',
    'ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)',
    'Amenity',
    'ค่าเช่าเครื่องกรองน้ำ Coway',
    'ค่าเช่าเครื่องกรองน้ำ',
    'ค่าน้ำเปล่า',
    'ค่าขนมคุ้กกี้',
    'ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท',
    'ค่ากาแฟ',
    'ค่าน้ำมันรถมอเตอร์ไซค์',
    'ค่าน้ำมัน',
    'ค่าเช่าที่จอดรถมอเตอร์ไซค์',
    'ค่าเช่าที่จอดรถ',
    'ค่าซ่อมบำรุงรถมอเตอร์ไซค์',
    'ค่าซ่อมบำรุงรถ',
    'ค่าเดินทางแม่บ้าน',
    'ค่าอุปกรณ์ทำความสะอาด',
    'ค่าน้ำยาซักผ้า',
    'ค่าน้ำยาสำหรับซักผ้า',
  ]

  // แยกรายจ่ายเป็น 2 กลุ่ม: เงินเดือนพนักงาน และ รายจ่ายอื่นๆ (ไม่รวมรายการที่จัดการใน GlobalSettings แล้ว)
  const otherExpenseCategories = expenseCategories.filter(
    (c) => c.id !== salaryCategoryId && !globalSettingsCategoryNames.includes(c.name)
  )

  // ฟังก์ชันดึงค่าแสดงผลสำหรับแต่ละ category
  const getDisplayAmount = (categoryId: number): number => {
    // ถ้าเป็นเงินเดือนพนักงาน ให้ใช้ค่าจาก salary summary
    if (categoryId === salaryCategoryId && salarySummary) {
      return salarySummary.salaryPerBuilding
    }
    return transactionData[categoryId] || 0
  }

  // เช็คว่า category นี้เป็น readonly หรือไม่ (เงินเดือนพนักงาน)
  const isSalaryCategory = (categoryId: number): boolean => {
    return categoryId === salaryCategoryId
  }

  // คำนวณยอดรวม (ใช้ getDisplayAmount เพื่อรวมเงินเดือนพนักงานด้วย)
  const totalRentalIncome = rentalIncomeCategories.reduce(
    (sum, c) => sum + getDisplayAmount(c.id),
    0
  )
  const totalOtherIncome = otherIncomeCategories.reduce(
    (sum, c) => sum + getDisplayAmount(c.id),
    0
  )
  const totalIncome = totalRentalIncome + totalOtherIncome

  // รวมค่าเช่าอาคารจาก settings ด้วย
  const monthlyRent = buildingSettings?.monthlyRent || 0

  // ค่าเช่าเครื่องกรองน้ำ Coway จาก settings
  const cowayWaterFilterExpense = buildingSettings?.cowayWaterFilterExpense || 0

  // ค่าดูแล MAX, ค่าดูแลจราจร, ค่าขนส่งสินค้า แสดงเฉพาะ 3 อาคาร (NANA, CT, YW) - ไม่รวม Funn D
  const selectedBuildingCode = buildings.find((b) => String(b.id) === selectedBuilding)?.code || ''
  const eligibleBuildingsForCare = ['NANA', 'CT', 'YW']
  const isEligibleForCareExpense = eligibleBuildingsForCare.includes(selectedBuildingCode)

  // ค่าใช้จ่ายส่วนกลาง (หารตามจำนวนอาคาร)
  // ค่าดูแล MAX, ค่าดูแลจราจร, ค่าขนส่งสินค้า แสดงเฉพาะอาคารที่ต้องจ่าย (3 อาคาร)
  const maxCareExpensePerBuilding = isEligibleForCareExpense ? (globalSettings?.maxCareExpensePerBuilding || 0) : 0
  const trafficCareExpensePerBuilding = isEligibleForCareExpense ? (globalSettings?.trafficCareExpensePerBuilding || 0) : 0
  const shippingExpensePerBuilding = isEligibleForCareExpense ? (globalSettings?.shippingExpensePerBuilding || 0) : 0
  const amenityExpensePerBuilding = globalSettings?.amenityExpensePerBuilding || 0
  const waterBottleExpensePerBuilding = globalSettings?.waterBottleExpensePerBuilding || 0
  const cookieExpensePerBuilding = globalSettings?.cookieExpensePerBuilding || 0
  const coffeeExpensePerBuilding = globalSettings?.coffeeExpensePerBuilding || 0
  const fuelExpensePerBuilding = globalSettings?.fuelExpensePerBuilding || 0
  const parkingExpensePerBuilding = globalSettings?.parkingExpensePerBuilding || 0
  const motorcycleMaintenanceExpensePerBuilding = globalSettings?.motorcycleMaintenanceExpensePerBuilding || 0
  const maidTravelExpensePerBuilding = globalSettings?.maidTravelExpensePerBuilding || 0
  const cleaningSupplyExpensePerBuilding = globalSettings?.cleaningSupplyExpensePerBuilding || 0
  const laundryDetergentExpensePerBuilding = globalSettings?.laundryDetergentExpensePerBuilding || 0

  // รวมค่าใช้จ่ายส่วนกลางทั้งหมด
  const totalGlobalExpense = maxCareExpensePerBuilding + trafficCareExpensePerBuilding +
    shippingExpensePerBuilding + amenityExpensePerBuilding + waterBottleExpensePerBuilding +
    cookieExpensePerBuilding + coffeeExpensePerBuilding + fuelExpensePerBuilding + parkingExpensePerBuilding +
    motorcycleMaintenanceExpensePerBuilding + maidTravelExpensePerBuilding +
    cleaningSupplyExpensePerBuilding + laundryDetergentExpensePerBuilding

  // คำนวณยอดรวมรายจ่าย: เงินเดือนพนักงาน + รายจ่ายอื่นๆ + ค่าเช่าอาคาร + ค่า Coway + ค่าใช้จ่ายส่วนกลาง
  const salaryExpense = salarySummary?.salaryPerBuilding || 0
  const otherExpense = otherExpenseCategories.reduce(
    (sum, c) => sum + (transactionData[c.id] || 0),
    0
  )
  const totalExpense = salaryExpense + otherExpense + monthlyRent + cowayWaterFilterExpense + totalGlobalExpense

  // ดึงประวัติค่าใช้จ่าย
  const fetchExpenseHistory = async (categoryId: number, month: string, year: string) => {
    if (!selectedBuilding) return

    setLoadingHistory(true)
    try {
      const params = new URLSearchParams({
        targetType: 'TRANSACTION',
        targetId: selectedBuilding,
        fieldName: String(categoryId),
        month,
        year,
      })
      const res = await fetch(`/api/expense-history?${params}`)
      const data = await res.json()
      setExpenseHistory(data.history || [])
      setHistoryTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching expense history:', error)
      setExpenseHistory([])
      setHistoryTotal(0)
    } finally {
      setLoadingHistory(false)
    }
  }

  // ลบรายการประวัติ
  const handleDeleteHistory = async (historyId: number) => {
    if (!confirm('ต้องการลบรายการนี้?')) return

    setDeletingId(historyId)
    try {
      const res = await fetch(`/api/expense-history/${historyId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        const data = await res.json()
        setExpenseHistory(data.history || [])
        setHistoryTotal(data.total || 0)
        // อัปเดตยอดใน transactionData ด้วย
        if (adjustCategoryId !== null) {
          setTransactionData((prev) => ({
            ...prev,
            [adjustCategoryId]: data.total || 0,
          }))
        }
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error deleting history:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setDeletingId(null)
    }
  }

  // เปลี่ยนเดือน/ปีในDialog
  const handleAdjustMonthYearChange = (newMonth: string, newYear: string) => {
    setAdjustMonth(newMonth)
    setAdjustYear(newYear)
    if (adjustCategoryId !== null) {
      fetchExpenseHistory(adjustCategoryId, newMonth, newYear)
    }
  }

  // เปิด Dialog เพิ่ม/ลดยอด
  const openAdjustDialog = (type: 'add' | 'subtract', categoryId: number, categoryName: string) => {
    setAdjustType(type)
    setAdjustCategoryId(categoryId)
    setAdjustCategoryName(categoryName)
    setAdjustAmount('')
    setAdjustDescription('')
    // ใช้เดือน/ปีที่เลือกในหน้าหลัก
    setAdjustMonth(selectedMonth)
    setAdjustYear(selectedYear)
    setAdjustDialogOpen(true)
    // ดึงประวัติ
    fetchExpenseHistory(categoryId, selectedMonth, selectedYear)
  }

  // คำนวณยอดใหม่ (preview)
  const getNewAmount = () => {
    const adjustValue = parseFloat(adjustAmount) || 0
    const newValue = adjustType === 'add'
      ? historyTotal + adjustValue
      : historyTotal - adjustValue
    return Math.max(0, newValue) // ไม่ให้ติดลบ
  }

  // ยืนยันการเพิ่ม/ลดยอด
  const handleAdjustConfirm = async () => {
    if (adjustCategoryId === null || !selectedBuilding) return
    if (!adjustDescription.trim()) {
      alert('กรุณากรอกรายละเอียด')
      return
    }
    if (!adjustAmount || parseFloat(adjustAmount) <= 0) {
      alert('กรุณากรอกจำนวนเงิน')
      return
    }

    // เก็บค่าไว้ก่อน async call เพื่อหลีกเลี่ยงปัญหา closure
    const currentCategoryId = adjustCategoryId
    const requestMonth = adjustMonth
    const requestYear = adjustYear
    const currentSelectedMonth = selectedMonth
    const currentSelectedYear = selectedYear

    setSavingHistory(true)
    try {
      const res = await fetch('/api/expense-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'TRANSACTION',
          targetId: selectedBuilding,
          fieldName: String(currentCategoryId),
          fieldLabel: adjustCategoryName,
          actionType: adjustType === 'add' ? 'ADD' : 'SUBTRACT',
          amount: adjustAmount,
          description: adjustDescription.trim(),
          month: requestMonth,
          year: requestYear,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setExpenseHistory(data.history || [])
        setHistoryTotal(data.total || 0)
        // อัปเดตยอดใน transactionData ถ้าเดือน/ปีตรงกับที่เลือกในหน้าหลัก
        if (requestMonth === currentSelectedMonth && requestYear === currentSelectedYear) {
          setTransactionData((prev) => ({
            ...prev,
            [currentCategoryId]: data.total || 0,
          }))
        }
        // Reset form
        setAdjustAmount('')
        setAdjustDescription('')
      } else {
        const errorData = await res.json()
        if (res.status === 401) {
          alert('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล')
          window.location.href = '/access/staff'
          return
        }
        alert(errorData.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving expense history:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSavingHistory(false)
    }
  }

  const selectedBuildingName =
    buildings.find((b) => String(b.id) === selectedBuilding)?.name || ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[#333] md:text-2xl">กรอกข้อมูล</h1>
          <p className="text-sm text-[#666] md:text-base">
            บันทึกรายรับ-รายจ่ายประจำเดือน
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="w-full bg-white sm:w-[200px]">
              <SelectValue placeholder="เลือกอาคาร" />
            </SelectTrigger>
            <SelectContent>
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
          </div>
        </div>
      </div>

      {/* Info Banner */}
      {selectedBuildingName && selectedBuilding && (
        <div
          className="rounded-lg p-4 text-white"
          style={{ backgroundColor: getBuildingColor(selectedBuilding) }}
        >
          <p className="font-medium">
            {selectedBuildingName} - {getMonthName(parseInt(selectedMonth))}{' '}
            {selectedYear}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-[#666]">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* รายรับ */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#84A59D] to-[#6b8a84] text-white flex flex-row items-center justify-between">
              <CardTitle className="text-white">รายรับ</CardTitle>
              <div className="text-right">
                <p className="text-sm text-white/80">รวมรายได้</p>
                <p className="text-xl font-bold text-white">{formatNumber(totalIncome)}</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* กลุ่ม 1: รายได้ค่าเช่า */}
              <div className="bg-[#84A59D]/10 px-4 py-2 border-b border-[#84A59D]/20">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-[#5a7d75]">รายได้ค่าเช่า</p>
                  <p className="text-sm font-bold text-[#5a7d75]">{formatNumber(totalRentalIncome)}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>รายการ</TableHead>
                    <TableHead className="w-[220px] text-right">จำนวนเงิน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rentalIncomeCategories.map((category, index) => (
                    <TableRow key={category.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#84A59D]/5'}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CategoryIcon name={category.name} className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1">
                          <div
                            className="text-right flex-1 px-3 py-2 bg-gray-50 border rounded-md text-sm font-medium min-w-[80px]"
                          >
                            {formatNumber(transactionData[category.id] || 0)}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                            onClick={() => openAdjustDialog('add', category.id, category.name)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                            onClick={() => openAdjustDialog('subtract', category.id, category.name)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* กลุ่ม 2: รายได้อื่นๆ */}
              {otherIncomeCategories.length > 0 && (
                <>
                  <div className="bg-[#F6BD60]/10 px-4 py-2 border-y border-[#F6BD60]/20">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-[#D4A24C]">รายได้อื่นๆ</p>
                      <p className="text-sm font-bold text-[#D4A24C]">{formatNumber(totalOtherIncome)}</p>
                    </div>
                  </div>
                  <Table>
                    <TableBody>
                      {otherIncomeCategories.map((category, index) => (
                        <TableRow key={category.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#F6BD60]/5'}>
                          <TableCell className="font-medium w-[50px]">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name={category.name} className="h-4 w-4 flex-shrink-0" />
                              <span className="text-sm">{category.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right w-[220px]">
                            <div className="flex items-center gap-1">
                              <div
                                className="text-right flex-1 px-3 py-2 bg-gray-50 border rounded-md text-sm font-medium min-w-[80px]"
                              >
                                {formatNumber(transactionData[category.id] || 0)}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                                onClick={() => openAdjustDialog('add', category.id, category.name)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                                onClick={() => openAdjustDialog('subtract', category.id, category.name)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>

          {/* รายจ่าย */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#F28482] to-[#d96f6d] text-white flex flex-row items-center justify-between">
              <CardTitle className="text-white">รายจ่าย</CardTitle>
              <div className="text-right">
                <p className="text-sm text-white/80">รวมค่าใช้จ่าย</p>
                <p className="text-xl font-bold text-white">{formatNumber(totalExpense)}</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>รายการ</TableHead>
                    <TableHead className="w-[220px] text-right">จำนวนเงิน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* อันดับ 1: ค่าเช่าอาคาร - ดึงจาก Settings */}
                  {monthlyRent > 0 && (
                    <TableRow className="bg-[#F6BD60]/10">
                      <TableCell className="font-medium">1</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CategoryIcon name="ค่าเช่าอาคาร" className="h-4 w-4 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-[#D4A24C]">ค่าเช่าอาคาร</span>
                            <p className="text-xs text-slate-400">
                              (ดึงจากหน้าตั้งค่าอาคาร)
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-medium text-[#D4A24C]">
                          {formatNumber(monthlyRent)}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* เงินเดือนพนักงาน */}
                  {salaryCategory && salarySummary && (
                    <TableRow className="bg-[#84A59D]/10">
                      <TableCell className="font-medium">{(monthlyRent > 0 ? 1 : 0) + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CategoryIcon name={salaryCategory.name} className="h-4 w-4 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-[#84A59D]">{salaryCategory.name}</span>
                            <p className="text-xs text-[#84A59D]">
                              (คำนวณจากหน้าเงินเดือนพนักงาน: {formatNumber(salarySummary.totalSalary)} / {salarySummary.buildingCount} อาคาร)
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-medium text-[#84A59D]">
                          {formatNumber(salarySummary.salaryPerBuilding)}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* ค่าใช้จ่ายส่วนกลาง - แสดงเฉพาะรายการที่มีค่ามากกว่า 0 */}
                  {globalSettings && (
                    <>
                      {/* ค่าดูแล MAX - เฉพาะ 3 อาคาร (NANA, CT, YW) */}
                      {maxCareExpensePerBuilding > 0 && (
                        <TableRow className="bg-[#9B59B6]/10">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="ค่าดูแล MAX" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-[#9B59B6]">ค่าดูแล MAX</span>
                                <p className="text-xs text-[#9B59B6]">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.maxCareExpense)} / {globalSettings.careExpenseDivisor} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-[#9B59B6]">{formatNumber(maxCareExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าดูแลจราจร - เฉพาะ 3 อาคาร (NANA, CT, YW) */}
                      {trafficCareExpensePerBuilding > 0 && (
                        <TableRow className="bg-[#E74C3C]/10">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) + (maxCareExpensePerBuilding > 0 ? 1 : 0) + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="ค่าดูแลจราจร" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-[#E74C3C]">ค่าดูแลจราจร</span>
                                <p className="text-xs text-[#E74C3C]">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.trafficCareExpense)} / {globalSettings.careExpenseDivisor} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-[#E74C3C]">{formatNumber(trafficCareExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าขนส่งสินค้า - เฉพาะ 3 อาคาร (NANA, CT, YW) */}
                      {shippingExpensePerBuilding > 0 && (
                        <TableRow className="bg-orange-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) + (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="ค่าขนส่งสินค้า" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-orange-600">ค่าขนส่งสินค้า</span>
                                <p className="text-xs text-orange-500">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.shippingExpense)} / {globalSettings.careExpenseDivisor} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-orange-600">{formatNumber(shippingExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่า Amenity - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-pink-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="Amenity" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-pink-500">ค่า Amenity (แปรงสีฟัน หมวกคลุมผม)</span>
                                <p className="text-xs text-pink-400">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.amenityExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-pink-500">{formatNumber(amenityExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าเช่าเครื่องกรองน้ำ Coway - แสดงเสมอ (หลัง Amenity) */}
                      <TableRow className="bg-cyan-100/50">
                        <TableCell className="font-medium">
                          {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                           (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                           (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CategoryIcon name="กรองน้ำ" className="h-4 w-4 flex-shrink-0" />
                            <div>
                              <span className="text-sm font-medium text-cyan-600">ค่าเช่าเครื่องกรองน้ำ Coway</span>
                              <p className="text-xs text-cyan-500">
                                (ดึงจากหน้าตั้งค่าอาคาร)
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-medium text-cyan-600">{formatNumber(cowayWaterFilterExpense)}</p>
                        </TableCell>
                      </TableRow>
                      {/* ค่าน้ำเปล่า - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-sky-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="น้ำเปล่า" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-cyan-500">ค่าน้ำเปล่า</span>
                                <p className="text-xs text-cyan-400">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.waterBottleExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-cyan-500">{formatNumber(waterBottleExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าขนมคุ้กกี้ - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-amber-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="คุ้กกี้" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-amber-500">ค่าขนมคุ้กกี้</span>
                                <p className="text-xs text-amber-400">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.cookieExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-amber-500">{formatNumber(cookieExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-amber-200/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="กาแฟ" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-amber-700">ค่ากาแฟซอง น้ำตาล คอฟฟี่เมท</span>
                                <p className="text-xs text-amber-600">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.coffeeExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-amber-700">{formatNumber(coffeeExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าน้ำมันรถมอเตอร์ไซค์ - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-gray-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="น้ำมัน" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-gray-600">ค่าน้ำมันรถมอเตอร์ไซค์</span>
                                <p className="text-xs text-gray-500">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.fuelExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-gray-600">{formatNumber(fuelExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าเช่าที่จอดรถมอเตอร์ไซค์ - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-slate-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="ที่จอดรถ" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-slate-600">ค่าเช่าที่จอดรถมอเตอร์ไซค์</span>
                                <p className="text-xs text-slate-500">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.parkingExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-slate-600">{formatNumber(parkingExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าซ่อมบำรุงรถมอเตอร์ไซค์ - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-orange-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="ซ่อมบำรุงรถ" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-orange-600">ค่าซ่อมบำรุงรถมอเตอร์ไซค์</span>
                                <p className="text-xs text-orange-500">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.motorcycleMaintenanceExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-orange-600">{formatNumber(motorcycleMaintenanceExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าเดินทางแม่บ้าน - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-violet-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="เดินทางแม่บ้าน" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-violet-600">ค่าเดินทางแม่บ้าน</span>
                                <p className="text-xs text-violet-500">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.maidTravelExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-violet-600">{formatNumber(maidTravelExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าอุปกรณ์ทำความสะอาด - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-teal-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="ทำความสะอาด" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-teal-600">ค่าอุปกรณ์ทำความสะอาด</span>
                                <p className="text-xs text-teal-500">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.cleaningSupplyExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-teal-600">{formatNumber(cleaningSupplyExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                      {/* ค่าน้ำยาซักผ้า - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-indigo-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon name="ซักผ้า" className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <span className="text-sm font-medium text-indigo-600">ค่าน้ำยาซักผ้า</span>
                                <p className="text-xs text-indigo-500">
                                  (ดึงจากหน้าตั้งค่า: {formatNumber(globalSettings.laundryDetergentExpense)} / {globalSettings.buildingCount} อาคาร)
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-medium text-indigo-600">{formatNumber(laundryDetergentExpensePerBuilding)}</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                  {/* รายจ่ายอื่นๆ */}
                  {otherExpenseCategories.map((category, index) => {
                    // baseIndex = ค่าเช่าอาคาร + ค่า Coway + เงินเดือน + ค่าดูแลMAX + ค่าดูแลจราจร + ค่าขนส่ง + 10 รายการค่าใช้จ่ายส่วนกลาง
                    const baseIndex = (monthlyRent > 0 ? 1 : 0) + 1 + (salaryCategory && salarySummary ? 1 : 0) +
                      (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                      (shippingExpensePerBuilding > 0 ? 1 : 0) + (globalSettings ? 10 : 0)
                    return (
                      <TableRow
                        key={category.id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-[#F28482]/5'}
                      >
                        <TableCell className="font-medium">{baseIndex + index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CategoryIcon name={category.name} className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{category.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1">
                            <div
                              className="text-right flex-1 px-3 py-2 bg-gray-50 border rounded-md text-sm font-medium min-w-[80px]"
                            >
                              {formatNumber(transactionData[category.id] || 0)}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                              onClick={() => openAdjustDialog('add', category.id, category.name)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                              onClick={() => openAdjustDialog('subtract', category.id, category.name)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog เพิ่ม/ลดยอด พร้อมประวัติ */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={adjustType === 'add' ? 'text-green-600' : 'text-red-600'}>
              {adjustType === 'add' ? '+ เพิ่มยอด' : '- ลดยอด'}: {adjustCategoryName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* เลือกเดือน/ปี */}
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-500 w-16">เดือน/ปี:</span>
              <Select
                value={adjustMonth}
                onValueChange={(val) => handleAdjustMonthYearChange(val, adjustYear)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={adjustYear}
                onValueChange={(val) => handleAdjustMonthYearChange(adjustMonth, val)}
              >
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto text-right">
                <span className="text-sm text-gray-500">ยอดรวม: </span>
                <span className="font-bold text-lg">{formatNumber(historyTotal)} บาท</span>
              </div>
            </div>

            {/* ตารางประวัติ */}
            <div className="border rounded-lg max-h-[200px] overflow-y-auto">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : expenseHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  ยังไม่มีประวัติ
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">วันที่</TableHead>
                      <TableHead>รายละเอียด</TableHead>
                      <TableHead className="text-right w-[100px]">จำนวน</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className={`text-right font-medium ${item.actionType === 'ADD' ? 'text-green-600' : 'text-red-600'}`}>
                          {item.actionType === 'ADD' ? '+' : '-'}{formatNumber(Number(item.amount))}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-gray-400 hover:text-red-600"
                            onClick={() => handleDeleteHistory(item.id)}
                            disabled={deletingId === item.id}
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Form เพิ่มรายการใหม่ */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {adjustType === 'add' ? 'เพิ่มรายการใหม่' : 'ลดรายการใหม่'}
              </p>
              <div>
                <label className="text-sm text-gray-500">รายละเอียด *</label>
                <Input
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  className="mt-1"
                  placeholder="เช่น ค่าซ่อมแอร์, ค่าฉีดปลวก..."
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">จำนวนเงิน *</label>
                <Input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="mt-1 text-right"
                  placeholder="0"
                />
              </div>
              {adjustAmount && parseFloat(adjustAmount) > 0 && (
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm">ยอดใหม่หลังบันทึก:</span>
                  <span className={`text-lg font-bold ${adjustType === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatNumber(getNewAmount())} บาท
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              ปิด
            </Button>
            <Button
              onClick={handleAdjustConfirm}
              disabled={savingHistory || !adjustDescription.trim() || !adjustAmount}
              className={adjustType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {savingHistory ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
