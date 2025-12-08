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

  const years = generateYears()

  // โหลดรายการอาคารและหมวดหมู่ และเงินเดือนพนักงาน
  useEffect(() => {
    Promise.all([
      fetch('/api/buildings').then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
      fetch('/api/employees/salary-summary').then((res) => res.json()),
    ])
      .then(([buildingsData, categoriesData, salaryData]) => {
        setBuildings(buildingsData)
        setCategories(categoriesData)
        setSalarySummary(salaryData)
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

  // แยกรายจ่ายเป็น 2 กลุ่ม: เงินเดือนพนักงาน และ รายจ่ายอื่นๆ
  const otherExpenseCategories = expenseCategories.filter((c) => c.id !== salaryCategoryId)

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
  const totalExpense = expenseCategories.reduce(
    (sum, c) => sum + getDisplayAmount(c.id),
    0
  ) + monthlyRent

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
      // ใช้ getDisplayAmount เพื่อบันทึกค่าเงินเดือนพนักงานด้วย
      const transactions = categories.map((c) => ({
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
                  {/* อันดับ 3 เป็นต้นไป: รายจ่ายอื่นๆ */}
                  {otherExpenseCategories.map((category, index) => {
                    const baseIndex = (monthlyRent > 0 ? 1 : 0) + (salaryCategory && salarySummary ? 1 : 0)
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
