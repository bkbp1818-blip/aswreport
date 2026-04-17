'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2, Users, Calculator, UserCheck, UserX, CalendarDays, Save, Check } from 'lucide-react'
import { formatNumber, MONTHS } from '@/lib/utils'
import { generateYears } from '@/lib/calculations'

interface Employee {
  id: number
  firstName: string
  lastName: string
  nickname: string | null
  position: 'MAID' | 'MANAGER' | 'PARTNER'
  salary: number
  isActive: boolean
}

type PositionType = 'MAID' | 'MANAGER' | 'PARTNER'

// ลำดับการแสดงกลุ่ม
const positionOrder: PositionType[] = ['PARTNER', 'MANAGER', 'MAID']

const positionIcons: Record<string, string> = {
  MAID: '🧹',
  MANAGER: '👔',
  PARTNER: '🤝',
}

interface SalarySummary {
  employees: Employee[]
  totalSalary: number
  buildingCount: number
  salaryPerBuilding: number
}

interface MonthlySalaryEmployee {
  id: number
  firstName: string
  lastName: string
  nickname: string | null
  position: 'MAID' | 'MANAGER' | 'PARTNER'
  salary: number
  monthlySalaryId: number | null
  monthlySalary: number | null
  effectiveSalary: number
}

interface MonthlySalaryData {
  employees: MonthlySalaryEmployee[]
  totalSalary: number
  salaryPerBuilding: number
  buildingCount: number
  month: number
  year: number
}

const positionLabels: Record<string, string> = {
  MAID: 'แม่บ้าน',
  MANAGER: 'ผู้จัดการ',
  PARTNER: 'หุ้นส่วน',
}

// สีอ้างอิงจาก Mediterranean Palette (เดียวกับสีอาคาร)
const positionColors: Record<string, string> = {
  PARTNER: '#1d3557',  // Deep Space Blue
  MANAGER: '#457b9d',  // Steel Blue
  MAID: '#2a9d8f',     // Teal
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [salarySummary, setSalarySummary] = useState<SalarySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  // Monthly salary state
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  )
  const [monthlySalaryData, setMonthlySalaryData] = useState<MonthlySalaryData | null>(null)
  const [loadingMonthly, setLoadingMonthly] = useState(false)
  const [editingMonthlySalary, setEditingMonthlySalary] = useState<Record<number, string>>({})
  const [savingMonthlySalary, setSavingMonthlySalary] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    position: 'MAID' as 'MAID' | 'MANAGER' | 'PARTNER',
    salary: 0,
    isActive: true,
  })

  // โหลดข้อมูลพนักงาน
  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      const data = await res.json()
      setEmployees(data)
    } catch (error) {
      console.error('Error loading employees:', error)
    }
  }

  // โหลดสรุปเงินเดือน
  const loadSalarySummary = async () => {
    try {
      const res = await fetch('/api/employees/salary-summary')
      const data = await res.json()
      setSalarySummary(data)
    } catch (error) {
      console.error('Error loading salary summary:', error)
    }
  }

  // โหลดเงินเดือนรายเดือน
  const loadMonthlySalary = async (month?: string, year?: string) => {
    const m = month || selectedMonth
    const y = year || selectedYear
    setLoadingMonthly(true)
    try {
      const res = await fetch(`/api/employees/monthly-salary?month=${m}&year=${y}`)
      const data = await res.json()
      setMonthlySalaryData(data)
      // Reset editing state
      setEditingMonthlySalary({})
    } catch (error) {
      console.error('Error loading monthly salary:', error)
    } finally {
      setLoadingMonthly(false)
    }
  }

  // บันทึกเงินเดือนรายเดือนของพนักงานคนหน��่ง
  const handleSaveMonthlySalary = async (employeeId: number) => {
    const salaryValue = editingMonthlySalary[employeeId]
    if (salaryValue === undefined) return

    setSavingMonthlySalary(employeeId)
    try {
      const res = await fetch('/api/employees/monthly-salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          salary: parseFloat(salaryValue) || 0,
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save')
      }

      // โหลดข้อมูลใหม่
      await loadMonthlySalary()
      // ลบ editing state ของคนนี้
      setEditingMonthlySalary((prev) => {
        const next = { ...prev }
        delete next[employeeId]
        return next
      })
    } catch (error) {
      console.error('Error saving monthly salary:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกเงินเดือนรายเดือน')
    } finally {
      setSavingMonthlySalary(null)
    }
  }

  useEffect(() => {
    Promise.all([loadEmployees(), loadSalarySummary(), loadMonthlySalary()])
      .finally(() => setLoading(false))
  }, [])

  // โหลดเงินเดือนรายเดือนใหม่เมื่อเปลี่ยนเดือน/ปี
  useEffect(() => {
    loadMonthlySalary()
  }, [selectedMonth, selectedYear])

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      nickname: '',
      position: 'MAID',
      salary: 0,
      isActive: true,
    })
    setEditingEmployee(null)
  }

  // เปิด dialog สำหรับแก้ไข
  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      nickname: employee.nickname || '',
      position: employee.position,
      salary: Number(employee.salary),
      isActive: employee.isActive,
    })
    setIsDialogOpen(true)
  }

  // Toggle active status
  const handleToggleActive = async (employee: Employee) => {
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          nickname: employee.nickname,
          position: employee.position,
          salary: employee.salary,
          isActive: !employee.isActive,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update')
      }

      await Promise.all([loadEmployees(), loadSalarySummary()])
    } catch (error) {
      console.error('Error toggling active:', error)
      alert('เกิดข้อผิดพลาดในการอัพเดท')
    }
  }

  // บันทึกพนักงาน
  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName) {
      alert('กรุณากรอกชื่อและนามสกุล')
      return
    }

    setSaving(true)
    try {
      const method = editingEmployee ? 'PUT' : 'POST'
      const body = editingEmployee
        ? { id: editingEmployee.id, ...formData }
        : formData

      const res = await fetch('/api/employees', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        if (res.status === 401) {
          alert('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล')
          window.location.href = '/access/partner'
          return
        }
        if (res.status === 403) {
          alert('เฉพาะ Partner เท่านั้นที่สามารถจัดการพนักงานได้')
          return
        }
        throw new Error(errorData.error || 'Failed to save')
      }

      await Promise.all([loadEmployees(), loadSalarySummary()])
      setIsDialogOpen(false)
      resetForm()
      alert('บันทึกข้อมูลพนักงานสำเร็จ')
    } catch (error) {
      console.error('Error saving employee:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  // ลบพนักงาน
  const handleDelete = async (id: number) => {
    if (!confirm('คุณต้องการลบพนักงานนี้หรือไม่?')) {
      return
    }

    try {
      const res = await fetch(`/api/employees?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      await Promise.all([loadEmployees(), loadSalarySummary()])
    } catch (error) {
      console.error('Error deleting employee:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#333] md:text-2xl">เงินเดือนพนักงาน</h1>
          <p className="text-sm text-[#666] md:text-base">
            จัดการข้อมูลพนักงานและเงินเดือน
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#84A59D] hover:bg-[#6b8a84]">
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มพนักงาน
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
              </DialogTitle>
              <DialogDescription>
                กรอกข้อมูลพนักงานให้ครบถ้วน
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">ชื่อ *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder="ชื่อ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">นามสกุล *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    placeholder="นามสกุล"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">ชื่อเล่น</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nickname: e.target.value }))
                  }
                  placeholder="ชื่อเล่น (ถ้ามี)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">ตำแหน่ง *</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, position: value as 'MAID' | 'MANAGER' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกตำแหน่ง" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAID">แม่บ้าน</SelectItem>
                    <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                    <SelectItem value="PARTNER">หุ้นส่วน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">เงินเดือน (บาท) *</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, salary: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  resetForm()
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#84A59D] hover:bg-[#6b8a84]"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingEmployee ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {salarySummary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 bg-gradient-to-br from-[#84A59D] to-[#6b8a84] text-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">
                จำนวนพนักงาน
              </CardTitle>
              <div className="rounded-full bg-white/20 p-1.5">
                <Users className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {salarySummary.employees.length} คน
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-[#F6BD60] to-[#e5a84a] text-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">
                เงินเดือนรวม
              </CardTitle>
              <div className="rounded-full bg-white/20 p-1.5">
                <Calculator className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatNumber(salarySummary.totalSalary)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-[#F28482] to-[#d96f6d] text-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">
                จำนวนอาคาร
              </CardTitle>
              <div className="rounded-full bg-white/20 p-1.5">
                <span className="text-white text-xs font-bold">x{salarySummary.buildingCount}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {salarySummary.buildingCount} อาคาร
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#84A59D] bg-gradient-to-r from-[#84A59D]/10 to-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[#84A59D]">
                เงินเดือนต่ออาคาร
              </CardTitle>
              <div className="rounded-full bg-[#84A59D]/20 p-1.5">
                <Calculator className="h-4 w-4 text-[#84A59D]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#84A59D]">
                {formatNumber(salarySummary.salaryPerBuilding)}
              </div>
              <p className="text-xs text-[#666] mt-1">
                = {formatNumber(salarySummary.totalSalary)} ÷ {salarySummary.buildingCount}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee List - แยกตามกลุ่ม */}
      {loading ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#84A59D]" />
              <span className="ml-2 text-[#666]">กำลังโหลดข้อมูล...</span>
            </div>
          </CardContent>
        </Card>
      ) : employees.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-[#666]">
              <Users className="h-12 w-12 mb-4 text-slate-300" />
              <p>ยังไม่มีข้อมูลพนักงาน</p>
              <p className="text-sm">คลิกปุ่ม "เพิ่มพนักงาน" เพื่อเริ่มต้น</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {positionOrder.map((position) => {
            // กรองตามตำแหน่ง และเรียงจากเงินเดือนสูงสุดไปน้อยสุด
            const positionEmployees = employees
              .filter((e) => e.position === position)
              .sort((a, b) => Number(b.salary) - Number(a.salary))
            if (positionEmployees.length === 0) return null

            const totalSalary = positionEmployees.reduce((sum, e) => sum + Number(e.salary), 0)

            return (
              <Card key={position} className="border-0 shadow-md overflow-hidden">
                {/* Header */}
                <div
                  className="px-4 py-3 text-white"
                  style={{ backgroundColor: positionColors[position] }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{positionIcons[position]}</span>
                      <h3 className="font-bold text-lg">{positionLabels[position]}</h3>
                    </div>
                    <Badge className="bg-white/20 text-white hover:bg-white/30">
                      {positionEmployees.length} คน
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-0">
                  <div className="divide-y">
                    {positionEmployees.map((employee, index) => (
                      <div
                        key={employee.id}
                        className={`p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[#333]">
                                {employee.firstName} {employee.lastName}
                              </p>
                              {employee.nickname && (
                                <span className="text-sm text-slate-500">
                                  ({employee.nickname})
                                </span>
                              )}
                              {!employee.isActive && (
                                <Badge variant="outline" className="text-red-500 border-red-300">
                                  ลาออกแล้ว
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500">เงินเดือน:</span>
                                <span className="font-semibold text-[#333]">
                                  {formatNumber(Number(employee.salary))} บาท
                                </span>
                              </div>
                              <div
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${positionColors[position]}20` }}
                              >
                                <span style={{ color: positionColors[position] }}>÷{salarySummary?.buildingCount || 0}</span>
                                <span className="font-bold" style={{ color: positionColors[position] }}>
                                  = {salarySummary && salarySummary.buildingCount > 0
                                    ? formatNumber(Number(employee.salary) / salarySummary.buildingCount)
                                    : '-'} บาท/อาคาร
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${
                                employee.isActive
                                  ? 'text-green-600 hover:text-green-700'
                                  : 'text-red-500 hover:text-red-600'
                              }`}
                              onClick={() => handleToggleActive(employee)}
                              title={employee.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                            >
                              {employee.isActive ? (
                                <UserCheck className="h-4 w-4" />
                              ) : (
                                <UserX className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-[#84A59D]"
                              onClick={() => handleEdit(employee)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-red-500"
                              onClick={() => handleDelete(employee.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer - Total */}
                  <div
                    className="px-4 py-3 border-t"
                    style={{ backgroundColor: `${positionColors[position]}15` }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-slate-500">รวมเงินเดือน</p>
                        <p className="font-bold text-[#333]">{formatNumber(totalSalary)} บาท</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">รวมต่ออาคาร (÷{salarySummary?.buildingCount || 0})</p>
                        <p className="font-bold text-lg" style={{ color: positionColors[position] }}>
                          {salarySummary && salarySummary.buildingCount > 0
                            ? formatNumber(totalSalary / salarySummary.buildingCount)
                            : '-'} บาท
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Monthly Salary Section */}
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-[#457b9d] to-[#1d3557] text-white rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <div>
                <CardTitle className="text-white">กรอกเงินเดือนรายเดือน</CardTitle>
                <CardDescription className="text-white/70">
                  ตั้งเงินเดือนแต่ละคนแยกตามเดือน (ถ้าไม่กรอก จะใช้ค่าเริ่มต้นจากข้อมูลพนักงาน)
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px] bg-white/20 border-white/30 text-white">
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
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px] bg-white/20 border-white/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateYears().map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingMonthly ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#457b9d]" />
              <span className="ml-2 text-[#666]">กำลังโหลดข้อมูล...</span>
            </div>
          ) : monthlySalaryData && monthlySalaryData.employees.length > 0 ? (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border-b">
                <div>
                  <p className="text-xs text-slate-500">เงินเดือนรวม (เดือนนี้)</p>
                  <p className="text-lg font-bold text-[#1d3557]">
                    {formatNumber(monthlySalaryData.totalSalary)} บาท
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">เงินเดือนต่ออาคาร (÷{monthlySalaryData.buildingCount})</p>
                  <p className="text-lg font-bold text-[#457b9d]">
                    {formatNumber(monthlySalaryData.salaryPerBuilding)} บาท
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs text-slate-500">เดือน/ปี</p>
                  <p className="text-lg font-bold text-[#84A59D]">
                    {MONTHS.find((m) => m.value === monthlySalaryData.month)?.label} {monthlySalaryData.year}
                  </p>
                </div>
              </div>

              {/* Employee salary table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>ชื่อ-นามสกุล</TableHead>
                      <TableHead>ตำแหน่ง</TableHead>
                      <TableHead className="text-right">เงินเดือนเริ่มต้น</TableHead>
                      <TableHead className="text-right">เงินเดือนเดือนนี้</TableHead>
                      <TableHead className="w-[80px] text-center">บันทึก</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySalaryData.employees.map((emp, index) => {
                      const isEditing = editingMonthlySalary[emp.id] !== undefined
                      const hasMonthlyOverride = emp.monthlySalary !== null
                      const isSaving = savingMonthlySalary === emp.id

                      return (
                        <TableRow key={emp.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <TableCell className="text-slate-500">{index + 1}</TableCell>
                          <TableCell>
                            <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                            {emp.nickname && (
                              <span className="text-sm text-slate-500 ml-1">({emp.nickname})</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className="text-white"
                              style={{ backgroundColor: positionColors[emp.position] }}
                            >
                              {positionIcons[emp.position]} {positionLabels[emp.position]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-slate-500">
                            {formatNumber(emp.salary)} บาท
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                className="w-[140px] text-right"
                                placeholder={String(emp.salary)}
                                value={
                                  isEditing
                                    ? editingMonthlySalary[emp.id]
                                    : hasMonthlyOverride
                                      ? String(emp.monthlySalary)
                                      : ''
                                }
                                onChange={(e) =>
                                  setEditingMonthlySalary((prev) => ({
                                    ...prev,
                                    [emp.id]: e.target.value,
                                  }))
                                }
                              />
                              {!hasMonthlyOverride && !isEditing && (
                                <span className="text-xs text-slate-400 whitespace-nowrap">ค่าเริ่มต้น</span>
                              )}
                              {hasMonthlyOverride && !isEditing && (
                                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {isEditing && (
                              <Button
                                size="sm"
                                className="bg-[#84A59D] hover:bg-[#6b8a84] h-8 px-3"
                                onClick={() => handleSaveMonthlySalary(emp.id)}
                                disabled={isSaving}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[#666]">
              <Users className="h-12 w-12 mb-4 text-slate-300" />
              <p>ยังไม่มีพนักงานที่ใช้งานอยู่</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-0 shadow-md bg-[#F6BD60]/10 border-[#F6BD60]">
        <CardHeader>
          <CardTitle className="text-[#333]">หมายเหตุ</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#666] space-y-2">
          <p>
            * เงินเดือนพนักงานจะถูกหารเฉลี่ยตามจำนวนอาคาร และนำไปแสดงในหน้ากรอกข้อมูลรายรับ-รายจ่ายโดยอัตโนมัติ
          </p>
          <p>
            * ตัวอย่าง: ถ้าเงินเดือนรวม {formatNumber(salarySummary?.totalSalary || 0)} บาท
            หาร {salarySummary?.buildingCount || 0} อาคาร
            = {formatNumber(salarySummary?.salaryPerBuilding || 0)} บาท/อาคาร
          </p>
          <p>
            * ส่วน "กรอกเงินเดือนรายเดือน" ด้านบน ใช้สำหรับกรณีที่เงินเดือนพนักงานมีการปรับเปลี่ยนในบางเดือน
            ถ้าไม่ได้กรอก ระบบจะใช้ค่าเริ่มต้นจากข้อมูลพนักงานโดยอัตโนมัติ
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
