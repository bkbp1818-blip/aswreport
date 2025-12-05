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
import { Save, Loader2 } from 'lucide-react'

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

  const years = generateYears()

  // โหลดรายการอาคารและหมวดหมู่
  useEffect(() => {
    Promise.all([
      fetch('/api/buildings').then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
    ])
      .then(([buildingsData, categoriesData]) => {
        setBuildings(buildingsData)
        setCategories(categoriesData)
        if (buildingsData.length > 0 && !selectedBuilding) {
          setSelectedBuilding(String(buildingsData[0].id))
        }
      })
      .catch((err) => console.error('Error loading data:', err))
      .finally(() => setLoading(false))
  }, [])

  // โหลดข้อมูล transactions เมื่อเลือกอาคาร/เดือน/ปี
  const loadTransactions = useCallback(async () => {
    if (!selectedBuilding || !selectedMonth || !selectedYear) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        buildingId: selectedBuilding,
        month: selectedMonth,
        year: selectedYear,
      })
      const res = await fetch(`/api/transactions?${params}`)
      const data: Transaction[] = await res.json()

      // แปลงข้อมูลเป็น Record<categoryId, amount>
      const dataMap: Record<number, number> = {}
      data.forEach((t) => {
        dataMap[t.categoryId] = Number(t.amount)
      })
      setTransactionData(dataMap)
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

  // คำนวณยอดรวม
  const totalIncome = incomeCategories.reduce(
    (sum, c) => sum + (transactionData[c.id] || 0),
    0
  )
  const totalExpense = expenseCategories.reduce(
    (sum, c) => sum + (transactionData[c.id] || 0),
    0
  )

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
      const transactions = categories.map((c) => ({
        buildingId: parseInt(selectedBuilding),
        categoryId: c.id,
        amount: transactionData[c.id] || 0,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
      }))

      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      })

      if (!res.ok) {
        throw new Error('Failed to save')
      }

      alert('บันทึกข้อมูลสำเร็จ!')
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">กรอกข้อมูล</h1>
          <p className="text-slate-500">
            บันทึกรายรับ-รายจ่ายประจำเดือน
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="เลือกอาคาร" />
            </SelectTrigger>
            <SelectContent>
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

          <Button onClick={handleSave} disabled={saving || !selectedBuilding}>
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
      {selectedBuildingName && (
        <div className="rounded-lg bg-blue-50 p-4 text-blue-800">
          <p className="font-medium">
            {selectedBuildingName} - {getMonthName(parseInt(selectedMonth))}{' '}
            {selectedYear}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* รายรับ */}
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-700">รายรับ</CardTitle>
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
                  {incomeCategories.map((category, index) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{category.name}</TableCell>
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
                <TableFooter>
                  <TableRow className="bg-green-100">
                    <TableCell colSpan={2} className="font-bold text-green-700">
                      รวมรายได้ค่าเช่า
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-700">
                      {formatNumber(totalIncome)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* รายจ่าย */}
          <Card>
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-700">รายจ่าย</CardTitle>
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
                  {expenseCategories.map((category, index) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{category.name}</TableCell>
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
                <TableFooter>
                  <TableRow className="bg-red-100">
                    <TableCell colSpan={2} className="font-bold text-red-700">
                      รวมค่าใช้จ่าย
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-700">
                      {formatNumber(totalExpense)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary */}
      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>สรุป</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-600">รวมรายได้</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatNumber(totalIncome)}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">รวมค่าใช้จ่าย</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatNumber(totalExpense)}
                </p>
              </div>
              <div
                className={`rounded-lg p-4 ${
                  totalIncome - totalExpense >= 0 ? 'bg-blue-50' : 'bg-orange-50'
                }`}
              >
                <p
                  className={`text-sm ${
                    totalIncome - totalExpense >= 0
                      ? 'text-blue-600'
                      : 'text-orange-600'
                  }`}
                >
                  Gross Profit
                </p>
                <p
                  className={`text-2xl font-bold ${
                    totalIncome - totalExpense >= 0
                      ? 'text-blue-700'
                      : 'text-orange-700'
                  }`}
                >
                  {formatNumber(totalIncome - totalExpense)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
