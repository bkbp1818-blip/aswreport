'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Pencil, Trash2, Loader2, HandCoins, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react'
import { formatNumber, MONTHS } from '@/lib/utils'
import { generateYears } from '@/lib/calculations'

interface Building {
  id: number
  name: string
  code: string
}

interface Reimbursement {
  id: number
  amount: number
  buildingId: number
  month: number
  year: number
  creditorName: string
  description: string | null
  paidDate: string | null
  returnedDate: string | null
  isReturned: boolean
  building: Building
}

const currentDate = new Date()
const currentMonth = currentDate.getMonth() + 1
const currentYear = currentDate.getFullYear()

export default function ReimbursementsPage() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Reimbursement | null>(null)

  // Filter state
  const [filterBuilding, setFilterBuilding] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString())
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString())

  // Form state
  const [formData, setFormData] = useState({
    buildingIds: [] as string[],
    month: currentMonth.toString(),
    year: currentYear.toString(),
    creditorName: '',
    description: '',
    amount: '',
    paidDate: '',
    returnedDate: '',
  })

  const years = generateYears()

  // โหลดรายการอาคาร
  const loadBuildings = async () => {
    try {
      const res = await fetch('/api/buildings')
      const data = await res.json()
      setBuildings(data)
    } catch (error) {
      console.error('Error loading buildings:', error)
    }
  }

  // โหลดรายการยอดค้างจ่ายคืน
  const loadReimbursements = async () => {
    try {
      const params = new URLSearchParams()
      if (filterBuilding !== 'all') params.set('buildingId', filterBuilding)
      if (filterMonth) params.set('month', filterMonth)
      if (filterYear) params.set('year', filterYear)

      const res = await fetch(`/api/reimbursements?${params.toString()}`)
      const data = await res.json()
      setReimbursements(data)
    } catch (error) {
      console.error('Error loading reimbursements:', error)
    }
  }

  useEffect(() => {
    loadBuildings().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading) {
      loadReimbursements()
    }
  }, [filterBuilding, filterMonth, filterYear, loading])

  // Reset form
  const resetForm = () => {
    setFormData({
      buildingIds: [],
      month: currentMonth.toString(),
      year: currentYear.toString(),
      creditorName: '',
      description: '',
      amount: '',
      paidDate: '',
      returnedDate: '',
    })
    setEditingItem(null)
  }

  // เปิด dialog สำหรับแก้ไข (แก้ไขทีละ 1 อาคาร เพราะเป็นรายการที่สร้างแล้ว)
  const handleEdit = (item: Reimbursement) => {
    setEditingItem(item)
    setFormData({
      buildingIds: [item.buildingId.toString()],
      month: item.month.toString(),
      year: item.year.toString(),
      creditorName: item.creditorName,
      description: item.description || '',
      amount: Number(item.amount).toString(),
      paidDate: item.paidDate ? item.paidDate.split('T')[0] : '',
      returnedDate: item.returnedDate ? item.returnedDate.split('T')[0] : '',
    })
    setIsDialogOpen(true)
  }

  // บันทึกรายการ
  const handleSave = async () => {
    if (formData.buildingIds.length === 0 || !formData.creditorName || !formData.amount) {
      alert('กรุณาเลือกอาคาร กรอกชื่อเจ้าหนี้ และจำนวนเงิน')
      return
    }

    setSaving(true)
    try {
      const method = editingItem ? 'PUT' : 'POST'
      const body = editingItem
        ? {
            id: editingItem.id,
            buildingId: formData.buildingIds[0],
            month: formData.month,
            year: formData.year,
            creditorName: formData.creditorName,
            description: formData.description,
            amount: formData.amount,
            paidDate: formData.paidDate,
            returnedDate: formData.returnedDate,
          }
        : formData

      const res = await fetch('/api/reimbursements', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        if (res.status === 401) {
          alert('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล')
          window.location.href = '/access/partner'
          return
        }
        if (res.status === 403) {
          alert('เฉพาะ Partner เท่านั้นที่สามารถจัดการข้อมูลได้')
          return
        }
        throw new Error('Failed to save')
      }

      await loadReimbursements()
      setIsDialogOpen(false)
      resetForm()
      alert(editingItem ? 'แก้ไขรายการสำเร็จ' : 'เพิ่มรายการสำเร็จ')
    } catch (error) {
      console.error('Error saving reimbursement:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  // คืนเงิน (เปลี่ยนสถานะ)
  const handleMarkReturned = async (item: Reimbursement) => {
    if (!confirm(`ยืนยันว่าคืนเงิน ${formatNumber(Number(item.amount))} บาท ให้ ${item.creditorName} แล้ว?`)) {
      return
    }

    try {
      const res = await fetch('/api/reimbursements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isReturned: true }),
      })

      if (!res.ok) throw new Error('Failed to update')
      await loadReimbursements()
    } catch (error) {
      console.error('Error marking as returned:', error)
      alert('เกิดข้อผิดพลาด')
    }
  }

  // ยกเลิกคืนเงิน (เปลี่ยนสถานะกลับ)
  const handleUndoReturned = async (item: Reimbursement) => {
    if (!confirm(`ยกเลิกสถานะคืนเงินให้ ${item.creditorName}?`)) {
      return
    }

    try {
      const res = await fetch('/api/reimbursements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isReturned: false }),
      })

      if (!res.ok) throw new Error('Failed to update')
      await loadReimbursements()
    } catch (error) {
      console.error('Error undoing returned:', error)
      alert('เกิดข้อผิดพลาด')
    }
  }

  // ลบรายการ
  const handleDelete = async (id: number) => {
    if (!confirm('คุณต้องการลบรายการนี้หรือไม่?')) {
      return
    }

    try {
      const res = await fetch(`/api/reimbursements?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete')
      await loadReimbursements()
    } catch (error) {
      console.error('Error deleting reimbursement:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  // คำนวณ summary
  const pendingItems = reimbursements.filter((r) => !r.isReturned)
  const returnedItems = reimbursements.filter((r) => r.isReturned)
  const totalPending = pendingItems.reduce((sum, r) => sum + Number(r.amount), 0)
  const totalReturned = returnedItems.reduce((sum, r) => sum + Number(r.amount), 0)

  // Format วันที่
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#333] md:text-2xl">ยอดค้างจ่ายคืน</h1>
          <p className="text-sm text-[#666] md:text-base">
            ติดตามยอดเงินที่ต้องคืนให้เจ้าหนี้
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#84A59D] hover:bg-[#6b8a84]">
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มรายการ
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
              </DialogTitle>
              <DialogDescription>
                กรอกข้อมูลยอดค้างจ่ายคืน
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>อาคาร * {!editingItem && formData.buildingIds.length > 1 && <span className="text-xs text-[#84A59D] font-normal">(เลือก {formData.buildingIds.length} อาคาร — ยอดจะหารเฉลี่ย)</span>}</Label>
                {editingItem ? (
                  <Select
                    value={formData.buildingIds[0] || ''}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, buildingIds: [value] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกอาคาร" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-md border p-3 space-y-2">
                    {buildings.map((b) => (
                      <div key={b.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`building-${b.id}`}
                          checked={formData.buildingIds.includes(b.id.toString())}
                          onCheckedChange={(checked) => {
                            setFormData((prev) => ({
                              ...prev,
                              buildingIds: checked
                                ? [...prev.buildingIds, b.id.toString()]
                                : prev.buildingIds.filter((id) => id !== b.id.toString()),
                            }))
                          }}
                        />
                        <label htmlFor={`building-${b.id}`} className="text-sm cursor-pointer">
                          {b.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>เดือน *</Label>
                  <Select
                    value={formData.month}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, month: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ปี *</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, year: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditorName">ชื่อคนที่ต้องคืนให้ *</Label>
                <Input
                  id="creditorName"
                  value={formData.creditorName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, creditorName: e.target.value }))
                  }
                  placeholder="เช่น สมชาย, ร้าน ABC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">รายละเอียด</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="เช่น ค่าซ่อมแอร์ ห้อง 101"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">จำนวนเงินรวม (บาท) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  placeholder="0"
                />
                {!editingItem && formData.buildingIds.length > 1 && formData.amount && (
                  <p className="text-xs text-[#84A59D]">
                    = {formatNumber(parseFloat(formData.amount) / formData.buildingIds.length)} บาท/อาคาร ({formData.buildingIds.length} อาคาร)
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paidDate">วันที่ยืมจ่ายเงิน</Label>
                  <Input
                    id="paidDate"
                    type="date"
                    value={formData.paidDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, paidDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="returnedDate">วันที่คืนเงิน</Label>
                  <Input
                    id="returnedDate"
                    type="date"
                    value={formData.returnedDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, returnedDate: e.target.value }))
                    }
                  />
                </div>
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
                {editingItem ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-[#666]">อาคาร</Label>
              <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกอาคาร</SelectItem>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#666]">เดือน</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-[#666]">ปี</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 bg-gradient-to-br from-[#F28482] to-[#d96f6d] text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              ยอดค้างจ่ายรวม
            </CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatNumber(totalPending)}
            </div>
            <p className="text-xs text-white/70 mt-1">บาท</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-[#84A59D] to-[#6b8a84] text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              ยอดที่คืนแล้ว
            </CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatNumber(totalReturned)}
            </div>
            <p className="text-xs text-white/70 mt-1">บาท</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-[#F6BD60] to-[#e5a84a] text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              จำนวนรายการค้างจ่าย
            </CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <HandCoins className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {pendingItems.length}
            </div>
            <p className="text-xs text-white/70 mt-1">รายการ</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {loading ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#84A59D]" />
              <span className="ml-2 text-[#666]">กำลังโหลดข้อมูล...</span>
            </div>
          </CardContent>
        </Card>
      ) : reimbursements.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-[#666]">
              <HandCoins className="h-12 w-12 mb-4 text-slate-300" />
              <p>ไม่มีรายการยอดค้างจ่ายคืนในเดือนนี้</p>
              <p className="text-sm">คลิกปุ่ม &quot;เพิ่มรายการ&quot; เพื่อเริ่มต้น</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-[#333] font-semibold">วันที่ยืมจ่าย</TableHead>
                  <TableHead className="text-[#333] font-semibold">อาคาร</TableHead>
                  <TableHead className="text-[#333] font-semibold">ชื่อเจ้าหนี้</TableHead>
                  <TableHead className="text-[#333] font-semibold">รายละเอียด</TableHead>
                  <TableHead className="text-[#333] font-semibold text-right">จำนวนเงิน</TableHead>
                  <TableHead className="text-[#333] font-semibold">วันที่คืนเงิน</TableHead>
                  <TableHead className="text-[#333] font-semibold text-center">สถานะ</TableHead>
                  <TableHead className="text-[#333] font-semibold text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reimbursements.map((item) => (
                  <TableRow key={item.id} className={item.isReturned ? 'bg-green-50/50' : ''}>
                    <TableCell className="text-sm">
                      {formatDate(item.paidDate)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {item.building.name}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {item.creditorName}
                    </TableCell>
                    <TableCell className="text-sm text-[#666]">
                      {item.description || '-'}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-right">
                      {formatNumber(Number(item.amount))}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(item.returnedDate)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.isReturned ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                          คืนแล้ว
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
                          ค้างจ่าย
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {item.isReturned ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-500 hover:text-orange-600"
                            onClick={() => handleUndoReturned(item)}
                            title="ยกเลิกคืนเงิน"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleMarkReturned(item)}
                            title="คืนเงินแล้ว"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-[#84A59D]"
                          onClick={() => handleEdit(item)}
                          title="แก้ไข"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-500"
                          onClick={() => handleDelete(item.id)}
                          title="ลบ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
