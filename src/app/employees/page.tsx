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
import { Plus, Pencil, Trash2, Loader2, Users, Calculator, CalendarDays, Save, Check, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react'
import { formatNumber, MONTHS } from '@/lib/utils'
import { generateYears, calculateSocialSecurity } from '@/lib/calculations'

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

interface SocialSecurityEmployee {
  id: number
  firstName: string
  lastName: string
  nickname: string | null
  position: 'MAID' | 'MANAGER' | 'PARTNER'
  contributionId: number | null
  amount: number
}

interface SocialSecurityData {
  employees: SocialSecurityEmployee[]
  totalAmount: number
  amountPerBuilding: number
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
  const [savingAllMonthlySalary, setSavingAllMonthlySalary] = useState(false)

  // Social security state
  const [socialSecurityData, setSocialSecurityData] = useState<SocialSecurityData | null>(null)
  const [ssToggles, setSsToggles] = useState<Record<number, boolean>>({}) // true = เปิด, false = ปิด, undefined = ยังไม่แก้
  const [savingAllSocialSecurity, setSavingAllSocialSecurity] = useState(false)

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

  // บันทึกเงินเดือนรายเดือนทั้งหมดที่แก้ไข (batch save)
  const handleSaveAllMonthlySalary = async () => {
    const editedIds = Object.keys(editingMonthlySalary)
    if (editedIds.length === 0) return

    setSavingAllMonthlySalary(true)
    try {
      const items = editedIds
        .map((id) => {
          const val = editingMonthlySalary[parseInt(id)]
          // ถ้าช่องว่าง → ส่ง -1 เพื่อลบ record (กลับไปใช้ค่า default)
          // ถ้า 0 → ปิดเงินเดือนเดือนนี้
          // ถ้า -1 → ลบ record (toggle เปิดกลับ)
          const salary = val === '' || val === undefined ? -1 : parseFloat(val)
          return { employeeId: parseInt(id), salary: isNaN(salary) ? -1 : salary }
        })
        // กรองออกรายการที่ไม่มีค่าจริงๆ เปลี่ยนแปลง (ช่องว่าง + ไม่มี override อยู่แล้ว)
        .filter((item) => {
          const emp = monthlySalaryData?.employees.find((e) => e.id === item.employeeId)
          if (!emp) return false
          // ถ้า salary = -1 (ลบ record) แต่ไม่มี override อยู่แล้ว → ข้าม
          if (item.salary < 0 && emp.monthlySalary === null) return false
          return true
        })

      const res = await fetch('/api/employees/monthly-salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save')
      }

      if (items.length === 0) {
        setEditingMonthlySalary({})
        setSavingAllMonthlySalary(false)
        return
      }

      // โหลดข้อมูลใหม่
      await loadMonthlySalary()
      alert(`บันทึกเงินเดือนรายเดือนสำเร็จ ${items.length} รายการ`)
    } catch (error) {
      console.error('Error saving monthly salary:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกเงินเดือนรายเดือน')
    } finally {
      setSavingAllMonthlySalary(false)
    }
  }

  // โหลดประกันสังคม
  const loadSocialSecurity = async (month?: string, year?: string) => {
    const m = month || selectedMonth
    const y = year || selectedYear
    try {
      const res = await fetch(`/api/social-security?month=${m}&year=${y}`)
      const data = await res.json()
      setSocialSecurityData(data)
      setSsToggles({})
    } catch (error) {
      console.error('Error loading social security:', error)
    }
  }

  // บันทึกประกันสังคมทั้งหมดที่แก้ไข (toggle)
  const handleSaveAllSocialSecurity = async () => {
    const editedIds = Object.keys(ssToggles)
    if (editedIds.length === 0) return

    setSavingAllSocialSecurity(true)
    try {
      for (const id of editedIds) {
        const empId = parseInt(id)
        const isOn = ssToggles[empId]
        // ถ้าเปิด → คำนวณจาก effectiveSalary, ถ้าปิด → 0
        const msEmp = monthlySalaryData?.employees.find((e) => e.id === empId)
        const amount = isOn && msEmp ? calculateSocialSecurity(msEmp.effectiveSalary) : 0

        const res = await fetch('/api/social-security', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: empId,
            amount,
            month: parseInt(selectedMonth),
            year: parseInt(selectedYear),
          }),
        })
        if (!res.ok) throw new Error('Failed to save')
      }

      await loadSocialSecurity()
      alert(`บันทึกประกันสังคมสำเร็จ ${editedIds.length} รายการ`)
    } catch (error) {
      console.error('Error saving social security:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกประกันสังคม')
    } finally {
      setSavingAllSocialSecurity(false)
    }
  }

  useEffect(() => {
    Promise.all([loadEmployees(), loadMonthlySalary(), loadSocialSecurity()])
      .finally(() => setLoading(false))
  }, [])

  // โหลดข้อมูลใหม่เมื่อเปลี่ยนเดือน/ปี
  useEffect(() => {
    loadMonthlySalary()
    loadSocialSecurity()
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

      await Promise.all([loadEmployees(), loadMonthlySalary()])
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

      await Promise.all([loadEmployees(), loadMonthlySalary()])
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

      await Promise.all([loadEmployees(), loadMonthlySalary()])
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month/Year Selector */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#457b9d]" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[130px]">
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
              <SelectTrigger className="w-[90px]">
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
      </div>

      {/* Summary Cards */}
      {monthlySalaryData && (
        (() => {
          // คำนวณประกันสังคมรวม real-time
          let ssTotalCalc = 0
          if (socialSecurityData && monthlySalaryData) {
            socialSecurityData.employees.forEach((emp) => {
              const msEmp = monthlySalaryData.employees.find((e) => e.id === emp.id)
              const calcAmount = msEmp ? calculateSocialSecurity(msEmp.effectiveSalary) : 0
              const savedIsOn = emp.amount > 0
              const isOn = ssToggles[emp.id] !== undefined ? ssToggles[emp.id] : savedIsOn
              ssTotalCalc += isOn ? calcAmount : 0
            })
          }
          const ssPerBuilding = ssTotalCalc / 3

          return (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
              {/* แถว 1: เงินเดือน */}
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
                    {monthlySalaryData.employees.length} คน
                  </div>
                  <p className="text-xs text-white/70 mt-1">
                    {MONTHS.find((m) => m.value === monthlySalaryData.month)?.label} {monthlySalaryData.year}
                  </p>
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
                    {formatNumber(monthlySalaryData.totalSalary)}
                  </div>
                  <p className="text-xs text-white/70 mt-1">
                    ต่ออาคาร (÷{monthlySalaryData.buildingCount}): {formatNumber(monthlySalaryData.salaryPerBuilding)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-[#F28482] to-[#d96f6d] text-white shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-white/90">
                    ประกันสังคมรวม
                  </CardTitle>
                  <div className="rounded-full bg-white/20 p-1.5">
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatNumber(ssTotalCalc)}
                  </div>
                  <p className="text-xs text-white/70 mt-1">
                    ต่ออาคาร (÷3): {formatNumber(ssPerBuilding)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )
        })()
      )}

      {/* Employee List - แยกตามกลุ่ม (read-only แสดงเงินเดือนตามเดือนที่เลือก) */}
      {loading ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#84A59D]" />
              <span className="ml-2 text-[#666]">กำลังโหลดข้อมูล...</span>
            </div>
          </CardContent>
        </Card>
      ) : !monthlySalaryData || monthlySalaryData.employees.length === 0 ? (
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
            // กรองจาก monthlySalaryData ตามตำแหน่ง และเรียงจากเงินเดือนสูงสุดไปน้อยสุด
            const positionEmployees = monthlySalaryData.employees
              .filter((e) => e.position === position)
              .sort((a, b) => b.effectiveSalary - a.effectiveSalary)
            if (positionEmployees.length === 0) return null

            const totalSalary = positionEmployees.reduce((sum, e) => sum + e.effectiveSalary, 0)
            const buildingCount = monthlySalaryData.buildingCount

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
                    {positionEmployees.map((emp, index) => {
                      const hasMonthlyOverride = emp.monthlySalary !== null
                      return (
                        <div
                          key={emp.id}
                          className={`px-4 py-3 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#333]">
                                {emp.firstName} {emp.lastName}
                              </p>
                              {emp.nickname && (
                                <span className="text-sm text-slate-400">({emp.nickname})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#333]">
                                {formatNumber(emp.effectiveSalary)}
                              </span>
                              <span className="text-xs text-slate-400">บาท</span>
                              {hasMonthlyOverride && emp.effectiveSalary !== emp.salary && (
                                <span className="text-xs text-[#F6BD60] font-medium">(ปรับ)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
                        <p className="text-xs text-slate-500">ต่ออาคาร (÷{buildingCount})</p>
                        <p className="font-bold text-lg" style={{ color: positionColors[position] }}>
                          {formatNumber(totalSalary / buildingCount)} บาท
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

      {/* Monthly Salary + Social Security — ซ้าย-ขวา */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ซ้าย: กรอกเงินเดือนรายเดือน */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-[#457b9d] to-[#1d3557] text-white rounded-t-lg py-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 flex-shrink-0" />
              <div>
                <CardTitle className="text-white text-sm md:text-base">
                  กรอกเงินเดือนรายเดือน
                </CardTitle>
                <CardDescription className="text-white/70 text-xs">
                  ถ้าไม่กรอก จะใช้ค่าเริ่มต้น
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMonthly ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#457b9d]" />
              </div>
            ) : monthlySalaryData && monthlySalaryData.employees.length > 0 ? (
              <>
                {/* Summary */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b text-xs">
                  <span className="text-slate-500">รวม: <span className="font-bold text-[#1d3557]">{formatNumber(monthlySalaryData.totalSalary)}</span></span>
                  <span className="text-slate-500">ต่ออาคาร: <span className="font-bold text-[#457b9d]">{formatNumber(monthlySalaryData.salaryPerBuilding)}</span></span>
                </div>

                {/* Employee list */}
                <div className="divide-y">
                  {monthlySalaryData.employees.map((emp, index) => {
                    const isEditing = editingMonthlySalary[emp.id] !== undefined
                    const hasMonthlyOverride = emp.monthlySalary !== null
                    // "ปิดเงินเดือน" = มี record แต่ค่า = 0
                    const isDisabledThisMonth = hasMonthlyOverride && emp.monthlySalary === 0
                    // ถ้ากำลังแก้ไขเป็น "0" ก็ถือว่าปิด
                    const isEditingToZero = isEditing && editingMonthlySalary[emp.id] === '0'
                    const showAsDisabled = isDisabledThisMonth || isEditingToZero

                    return (
                      <div key={emp.id} className={`flex items-center gap-2 px-3 py-2 ${showAsDisabled ? 'bg-red-50/50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        {/* ปุ่ม toggle ปิด/เปิด */}
                        <button
                          type="button"
                          className="flex-shrink-0"
                          title={showAsDisabled ? 'เปิดเงินเดือนเดือนนี้' : 'ปิดเงินเดือนเดือนนี้ (ลาออก/ไม่จ่าย)'}
                          onClick={() => {
                            if (showAsDisabled) {
                              // เปิดกลับ → ลบ editing state (ถ้ามี) หรือตั้งเป็น -1 เพื่อลบ record
                              if (isEditing) {
                                setEditingMonthlySalary((prev) => {
                                  const next = { ...prev }
                                  delete next[emp.id]
                                  return next
                                })
                              } else {
                                // มี record = 0 อยู่ → ตั้งเป็น -1 เพื่อลบ record กลับไปใช้ค่า default
                                setEditingMonthlySalary((prev) => ({ ...prev, [emp.id]: '-1' }))
                              }
                            } else {
                              // ปิด → ตั้งเป็น 0
                              setEditingMonthlySalary((prev) => ({ ...prev, [emp.id]: '0' }))
                            }
                          }}
                        >
                          {showAsDisabled ? (
                            <ToggleLeft className="h-5 w-5 text-red-400" />
                          ) : (
                            <ToggleRight className="h-5 w-5 text-green-500" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${showAsDisabled ? 'text-slate-400 line-through' : 'text-[#333]'}`}>
                            {emp.firstName} {emp.lastName}
                          </p>
                          {showAsDisabled && (
                            <p className="text-[10px] text-red-400">ปิดเงินเดือนเดือนนี้</p>
                          )}
                        </div>
                        <Input
                          type="number"
                          className={`w-[110px] h-8 text-right text-sm ${showAsDisabled ? 'opacity-40' : ''}`}
                          placeholder={String(emp.salary)}
                          disabled={showAsDisabled}
                          value={
                            showAsDisabled
                              ? '0'
                              : isEditing
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
                        <div className="w-5 flex-shrink-0">
                          {showAsDisabled && !isEditing && <span className="text-[10px] text-red-400">✕</span>}
                          {!showAsDisabled && hasMonthlyOverride && !isEditing && <Check className="h-4 w-4 text-green-500" />}
                          {!showAsDisabled && isEditing && <Pencil className="h-4 w-4 text-[#F6BD60]" />}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Save button */}
                <div className="flex items-center justify-between p-3 border-t bg-slate-50">
                  <div className="text-xs text-slate-500">
                    {Object.keys(editingMonthlySalary).length > 0 ? (
                      <span className="text-[#F6BD60] font-medium">
                        แก้ไข {Object.keys(editingMonthlySalary).length} รายการ
                      </span>
                    ) : (
                      <span>กรอกแล้วกดบันทึก</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#84A59D] hover:bg-[#6b8a84]"
                    onClick={handleSaveAllMonthlySalary}
                    disabled={savingAllMonthlySalary || Object.keys(editingMonthlySalary).length === 0}
                  >
                    {savingAllMonthlySalary ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-3 w-3" />
                    )}
                    บันทึก
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-[#666]">
                ยังไม่มีพนักงาน
              </div>
            )}
          </CardContent>
        </Card>

        {/* ขวา: ประกันสังคม (คำนวณ auto จากเงินเดือน) */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-[#F28482] to-[#d96f6d] text-white rounded-t-lg py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 flex-shrink-0" />
              <div>
                <CardTitle className="text-white text-sm md:text-base">
                  เงินสมทบประกันสังคม (นายจ้าง)
                </CardTitle>
                <CardDescription className="text-white/70 text-xs">
                  คำนวณ auto 5% ของเงินเดือน (สูงสุด 875 บาท) หาร 3 อาคาร
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {socialSecurityData && socialSecurityData.employees.length > 0 && monthlySalaryData ? (
              <>
                {/* Summary — คำนวณยอดรวมจาก toggle + effectiveSalary เสมอ */}
                {(() => {
                  let previewTotal = 0
                  socialSecurityData.employees.forEach((emp) => {
                    const msEmp = monthlySalaryData.employees.find((e) => e.id === emp.id)
                    const calcAmount = msEmp ? calculateSocialSecurity(msEmp.effectiveSalary) : 0
                    // ถ้ามี toggle → ใช้ค่า toggle, ถ้าไม่มี → ดูจาก DB ว่าเปิดอยู่ไหม
                    const savedIsOn = emp.amount > 0
                    const isOn = ssToggles[emp.id] !== undefined ? ssToggles[emp.id] : savedIsOn
                    previewTotal += isOn ? calcAmount : 0
                  })
                  return (
                    <div className="flex items-center justify-between px-4 py-2 bg-pink-50/50 border-b text-xs">
                      <span className="text-slate-500">รวม: <span className="font-bold text-[#F28482]">{formatNumber(previewTotal)}</span></span>
                      <span className="text-slate-500">ต่ออาคาร: <span className="font-bold text-[#d96f6d]">{formatNumber(previewTotal / 3)}</span></span>
                    </div>
                  )
                })()}

                {/* Employee list */}
                <div className="divide-y">
                  {socialSecurityData.employees.map((emp, index) => {
                    const msEmp = monthlySalaryData.employees.find((e) => e.id === emp.id)
                    const effectiveSalary = msEmp?.effectiveSalary || 0
                    const calcAmount = calculateSocialSecurity(effectiveSalary)

                    // สถานะปัจจุบัน: เปิดอยู่ถ้ามี amount > 0 ใน DB
                    const savedIsOn = emp.amount > 0
                    // สถานะ toggle: ถ้ายังไม่แก้ → ใช้ค่าจาก DB
                    const isOn = ssToggles[emp.id] !== undefined ? ssToggles[emp.id] : savedIsOn
                    const hasToggled = ssToggles[emp.id] !== undefined
                    const displayAmount = isOn ? calcAmount : 0

                    return (
                      <div key={emp.id} className={`flex items-center gap-2 px-3 py-2 ${!isOn ? 'bg-red-50/50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        {/* Toggle */}
                        <button
                          type="button"
                          className="flex-shrink-0"
                          title={isOn ? 'ปิดประกันสังคม (ลาออก/ไม่จ่าย)' : 'เปิดประกันสังคม'}
                          onClick={() => {
                            setSsToggles((prev) => ({ ...prev, [emp.id]: !isOn }))
                          }}
                        >
                          {isOn ? (
                            <ToggleRight className="h-5 w-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-red-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${!isOn ? 'text-slate-400 line-through' : 'text-[#333]'}`}>
                            {emp.firstName} {emp.lastName}
                          </p>
                          {!isOn && (
                            <p className="text-[10px] text-red-400">ไม่จ่ายเดือนนี้</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-semibold ${!isOn ? 'text-slate-300' : 'text-[#F28482]'}`}>
                            {formatNumber(displayAmount)}
                          </p>
                          {isOn && effectiveSalary > 0 && (
                            <p className="text-[10px] text-slate-400">5% × {formatNumber(effectiveSalary)}</p>
                          )}
                        </div>
                        <div className="w-5 flex-shrink-0">
                          {hasToggled && <Pencil className="h-4 w-4 text-[#F6BD60]" />}
                          {!hasToggled && savedIsOn && <Check className="h-4 w-4 text-green-500" />}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Save button */}
                <div className="flex items-center justify-between p-3 border-t bg-slate-50">
                  <div className="text-xs text-slate-500">
                    {Object.keys(ssToggles).length > 0 ? (
                      <span className="text-[#F6BD60] font-medium">
                        แก้ไข {Object.keys(ssToggles).length} รายการ
                      </span>
                    ) : (
                      <span>กด toggle เปิด/ปิด แล้วกดบันทึก</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#F28482] hover:bg-[#d96f6d]"
                    onClick={handleSaveAllSocialSecurity}
                    disabled={savingAllSocialSecurity || Object.keys(ssToggles).length === 0}
                  >
                    {savingAllSocialSecurity ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-3 w-3" />
                    )}
                    บันทึก
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-[#666]">
                ยังไม่มีพนักงาน
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
            * ตัวอย่าง: ถ้าเงินเดือนรวม {formatNumber(monthlySalaryData?.totalSalary || 0)} บาท
            หาร {monthlySalaryData?.buildingCount || 0} อาคาร
            = {formatNumber(monthlySalaryData?.salaryPerBuilding || 0)} บาท/อาคาร
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
