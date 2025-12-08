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
import { Save, Loader2 } from 'lucide-react'
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
  const [saving, setSaving] = useState(false)
  const [salarySummary, setSalarySummary] = useState<SalarySummary | null>(null)
  const [buildingSettings, setBuildingSettings] = useState<BuildingSettings | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null)

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
      const params = new URLSearchParams({
        buildingId: selectedBuilding,
        month: selectedMonth,
        year: selectedYear,
      })

      // โหลด transactions และ settings พร้อมกัน
      const [transactionsRes, settingsRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch(`/api/settings?buildingId=${selectedBuilding}`)
      ])

      const data: Transaction[] = await transactionsRes.json()
      const settings = await settingsRes.json()

      // แปลงข้อมูลเป็น Record<categoryId, amount>
      const dataMap: Record<number, number> = {}
      data.forEach((t) => {
        dataMap[t.categoryId] = Number(t.amount)
      })
      setTransactionData(dataMap)

      // เก็บ settings ของอาคาร
      if (settings) {
        setBuildingSettings({
          monthlyRent: Number(settings.monthlyRent) || 0
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

  // รวมค่าใช้จ่ายส่วนกลางทั้งหมด
  const totalGlobalExpense = maxCareExpensePerBuilding + trafficCareExpensePerBuilding +
    shippingExpensePerBuilding + amenityExpensePerBuilding + waterBottleExpensePerBuilding +
    cookieExpensePerBuilding + coffeeExpensePerBuilding + fuelExpensePerBuilding + parkingExpensePerBuilding +
    motorcycleMaintenanceExpensePerBuilding + maidTravelExpensePerBuilding

  // คำนวณยอดรวมรายจ่าย: เงินเดือนพนักงาน + รายจ่ายอื่นๆ + ค่าเช่าอาคาร + ค่าใช้จ่ายส่วนกลาง
  const salaryExpense = salarySummary?.salaryPerBuilding || 0
  const otherExpense = otherExpenseCategories.reduce(
    (sum, c) => sum + (transactionData[c.id] || 0),
    0
  )
  const totalExpense = salaryExpense + otherExpense + monthlyRent + totalGlobalExpense

  // อัปเดตค่าในตาราง
  const handleAmountChange = (categoryId: number, value: string) => {
    const numValue = parseFloat(value) || 0
    setTransactionData((prev) => ({
      ...prev,
      [categoryId]: numValue,
    }))
  }

  // บันทึกข้อมูล
  const handleSave = async () => {
    if (!selectedBuilding) {
      alert('กรุณาเลือกอาคาร')
      return
    }

    setSaving(true)
    try {
      // กรองเฉพาะ categories ที่ต้องบันทึก (ไม่รวมค่าที่จัดการใน GlobalSettings แล้ว)
      const categoriesToSave = categories.filter(
        (c) => !globalSettingsCategoryNames.includes(c.name)
      )

      // ใช้ getDisplayAmount เพื่อบันทึกค่าเงินเดือนพนักงานด้วย
      const transactions = categoriesToSave.map((c) => ({
        buildingId: parseInt(selectedBuilding),
        categoryId: c.id,
        amount: getDisplayAmount(c.id),
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
      }))

      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        if (res.status === 401) {
          alert('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล')
          window.location.href = '/access/staff'
          return
        }
        if (res.status === 403) {
          alert('คุณไม่มีสิทธิ์ในการบันทึกข้อมูลนี้')
          return
        }
        throw new Error(errorData.error || 'Failed to save')
      }
      alert('บันทึกข้อมูลสำเร็จ')
    } catch (err) {
      console.error('Error saving:', err)
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setSaving(false)
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

          <Button
            onClick={handleSave}
            disabled={saving || !selectedBuilding}
            className="w-full sm:w-auto bg-[#84A59D] hover:bg-[#6b8a84]"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            บันทึก
          </Button>
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
                    <TableHead className="w-[150px] text-right">จำนวนเงิน</TableHead>
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
                        <Input
                          type="number"
                          value={transactionData[category.id] || ''}
                          onChange={(e) =>
                            handleAmountChange(category.id, e.target.value)
                          }
                          className="text-right"
                          placeholder="0.00"
                        />
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
                          <TableCell className="text-right w-[150px]">
                            <Input
                              type="number"
                              value={transactionData[category.id] || ''}
                              onChange={(e) =>
                                handleAmountChange(category.id, e.target.value)
                              }
                              className="text-right"
                              placeholder="0.00"
                            />
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
                    <TableHead className="w-[150px] text-right">จำนวนเงิน</TableHead>
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
                  {/* อันดับ 2: เงินเดือนพนักงาน */}
                  {salaryCategory && salarySummary && (
                    <TableRow className="bg-[#84A59D]/10">
                      <TableCell className="font-medium">{monthlyRent > 0 ? 2 : 1}</TableCell>
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
                      {/* ค่าน้ำเปล่า - แสดงเสมอ */}
                      {globalSettings && (
                        <TableRow className="bg-cyan-100/50">
                          <TableCell className="font-medium">
                            {(monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                             (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1}
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
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1}
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
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1}
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
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1}
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
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1}
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
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1}
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
                             (shippingExpensePerBuilding > 0 ? 1 : 0) + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1}
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
                    </>
                  )}
                  {/* รายจ่ายอื่นๆ */}
                  {otherExpenseCategories.map((category, index) => {
                    // baseIndex = ค่าเช่าอาคาร + เงินเดือน + ค่าดูแลMAX + ค่าดูแลจราจร + ค่าขนส่ง + 8 รายการค่าใช้จ่ายส่วนกลาง
                    const baseIndex = (monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0) +
                      (maxCareExpensePerBuilding > 0 ? 1 : 0) + (trafficCareExpensePerBuilding > 0 ? 1 : 0) +
                      (shippingExpensePerBuilding > 0 ? 1 : 0) + (globalSettings ? 8 : 0)
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
                          <Input
                            type="number"
                            value={transactionData[category.id] || ''}
                            onChange={(e) =>
                              handleAmountChange(category.id, e.target.value)
                            }
                            className="text-right"
                            placeholder="0.00"
                          />
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

    </div>
  )
}
