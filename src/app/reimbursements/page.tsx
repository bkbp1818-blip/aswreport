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
import { Plus, Pencil, Trash2, Loader2, HandCoins, CheckCircle, AlertCircle, RotateCcw, ChevronDown, Building2, CalendarDays, Users, X, Filter } from 'lucide-react'
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

const CREDITORS = [
  { value: 'ป๊า', label: 'ป๊า' },
  { value: 'แบงค์', label: 'แบงค์' },
  { value: 'พลอย', label: 'พลอย' },
  { value: 'ASW', label: 'ASW' },
]

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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selectedReturnedIds, setSelectedReturnedIds] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Filter state (checkbox multi-select)
  const [filterBuildings, setFilterBuildings] = useState<string[]>([])
  const [filterMonths, setFilterMonths] = useState<string[]>([currentMonth.toString()])
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString())
  const [filterCreditors, setFilterCreditors] = useState<string[]>([])
  // เปิด/ปิด panel ตัวกรอง
  const [openFilter, setOpenFilter] = useState<string | null>(null)

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

  // ข้อมูลดิบจาก API (ก่อน��รอง)
  const [allReimbursements, setAllReimbursements] = useState<Reimbursement[]>([])

  // โหลดรายการยอดค้างจ่ายคืน (fetch ตาม year แล้วกรองฝั่ง client)
  const loadReimbursements = async () => {
    try {
      const params = new URLSearchParams()
      if (filterYear) params.set('year', filterYear)

      const res = await fetch(`/api/reimbursements?${params.toString()}`)
      const data = await res.json()
      setAllReimbursements(data)
    } catch (error) {
      console.error('Error loading reimbursements:', error)
    }
  }

  // กรองข้อมูลฝั่ง client (อาคาร, เดือน, ชื่อเจ้าหนี้)
  useEffect(() => {
    let filtered = allReimbursements
    if (filterBuildings.length > 0) {
      filtered = filtered.filter((r) => filterBuildings.includes(r.buildingId.toString()))
    }
    if (filterMonths.length > 0) {
      filtered = filtered.filter((r) => filterMonths.includes(r.month.toString()))
    }
    if (filterCreditors.length > 0) {
      filtered = filtered.filter((r) => filterCreditors.includes(r.creditorName))
    }
    setReimbursements(filtered)
    setSelectedIds(new Set())
    setSelectedReturnedIds(new Set())
  }, [allReimbursements, filterBuildings, filterMonths, filterCreditors])

  useEffect(() => {
    loadBuildings().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading) {
      loadReimbursements()
    }
  }, [filterYear, loading])

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

  // คืนเงินหลายรายการพร้อมกัน (bulk)
  const handleBulkMarkReturned = async () => {
    const count = selectedIds.size
    if (!confirm(`ยืนยันว่าคืนเงินทั้ง ${count} รายการแล้ว?`)) return

    setBulkLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/reimbursements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          returnedDate: today,
          isReturned: true,
        }),
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
        throw new Error('Failed to bulk update')
      }

      setSelectedIds(new Set())
      await loadReimbursements()
      alert(`คืนเงิน ${count} รายการสำเร็จ`)
    } catch (error) {
      console.error('Error bulk marking as returned:', error)
      alert('เกิดข้อผิดพลาดในการคืนเงิน')
    } finally {
      setBulkLoading(false)
    }
  }

  // ยกเลิกคืนเงินหลายรายการพร้อมกัน (bulk undo)
  const handleBulkUndoReturned = async () => {
    const count = selectedReturnedIds.size
    if (!confirm(`ยืนยันยกเลิกสถานะคืนเงินทั้ง ${count} รายการ?`)) return

    setBulkLoading(true)
    try {
      const res = await fetch('/api/reimbursements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedReturnedIds),
          returnedDate: null,
          isReturned: false,
        }),
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
        throw new Error('Failed to bulk undo')
      }

      setSelectedReturnedIds(new Set())
      await loadReimbursements()
      alert(`ยกเลิกคืนเงิน ${count} รายการสำเร็จ`)
    } catch (error) {
      console.error('Error bulk undoing returned:', error)
      alert('เกิดข้อผิดพลาด')
    } finally {
      setBulkLoading(false)
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

  // สำหรับ select all checkbox (ค้างจ่าย)
  const pendingFilteredIds = pendingItems.map((r) => r.id)
  const allPendingSelected = pendingFilteredIds.length > 0 && pendingFilteredIds.every((id) => selectedIds.has(id))
  const somePendingSelected = pendingFilteredIds.some((id) => selectedIds.has(id))

  // สำหรับ select all checkbox (คืนแล้ว)
  const returnedFilteredIds = returnedItems.map((r) => r.id)
  const allReturnedSelected = returnedFilteredIds.length > 0 && returnedFilteredIds.every((id) => selectedReturnedIds.has(id))
  const someReturnedSelected = returnedFilteredIds.some((id) => selectedReturnedIds.has(id))

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
                <Label>ชื่อคนที่ต้องคืนให้ *</Label>
                <Select
                  value={formData.creditorName}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, creditorName: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกชื่อเจ้าหนี้" />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDITORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        <CardContent className="pt-4 pb-4">
          {/* แถวปุ่มตัวกรอง + ปี */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-[#999] hidden sm:block" />

            {/* ปุ่ม: อาคาร */}
            <button
              onClick={() => setOpenFilter(openFilter === 'building' ? null : 'building')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filterBuildings.length > 0
                  ? 'bg-[#84A59D] text-white border-[#84A59D]'
                  : openFilter === 'building'
                    ? 'bg-slate-100 border-slate-300 text-[#333]'
                    : 'bg-white border-slate-200 text-[#666] hover:border-slate-300'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>อาคาร</span>
              {filterBuildings.length > 0 && (
                <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{filterBuildings.length}</span>
              )}
              <ChevronDown className={`h-3 w-3 transition-transform ${openFilter === 'building' ? 'rotate-180' : ''}`} />
            </button>

            {/* ปุ่ม: เดือน */}
            <button
              onClick={() => setOpenFilter(openFilter === 'month' ? null : 'month')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filterMonths.length > 0
                  ? 'bg-[#84A59D] text-white border-[#84A59D]'
                  : openFilter === 'month'
                    ? 'bg-slate-100 border-slate-300 text-[#333]'
                    : 'bg-white border-slate-200 text-[#666] hover:border-slate-300'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>เดือน</span>
              {filterMonths.length > 0 && (
                <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{filterMonths.length}</span>
              )}
              <ChevronDown className={`h-3 w-3 transition-transform ${openFilter === 'month' ? 'rotate-180' : ''}`} />
            </button>

            {/* ปุ่ม: เจ้าหนี้ */}
            <button
              onClick={() => setOpenFilter(openFilter === 'creditor' ? null : 'creditor')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filterCreditors.length > 0
                  ? 'bg-[#84A59D] text-white border-[#84A59D]'
                  : openFilter === 'creditor'
                    ? 'bg-slate-100 border-slate-300 text-[#333]'
                    : 'bg-white border-slate-200 text-[#666] hover:border-slate-300'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>เจ้าหนี้</span>
              {filterCreditors.length > 0 && (
                <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{filterCreditors.length}</span>
              )}
              <ChevronDown className={`h-3 w-3 transition-transform ${openFilter === 'creditor' ? 'rotate-180' : ''}`} />
            </button>

            {/* ปี dropdown */}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[90px] h-8 text-sm rounded-full">
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

            {/* ปุ่มล้างตัวกรองทั้งหมด */}
            {(filterBuildings.length > 0 || filterMonths.length > 0 || filterCreditors.length > 0) && (
              <button
                onClick={() => {
                  setFilterBuildings([])
                  setFilterMonths([])
                  setFilterCreditors([])
                  setOpenFilter(null)
                }}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              >
                <X className="h-3 w-3" />
                ล้างทั้งหมด
              </button>
            )}
          </div>

          {/* Panel: อาคาร */}
          {openFilter === 'building' && (
            <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[#666]">เลือกอาคาร {filterBuildings.length > 0 && <span className="text-[#84A59D]">({filterBuildings.length})</span>}</p>
                {filterBuildings.length > 0 && (
                  <button className="text-xs text-[#84A59D] hover:underline" onClick={() => setFilterBuildings([])}>ล��าง</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {buildings.map((b) => (
                  <label
                    key={b.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer border transition-colors ${
                      filterBuildings.includes(b.id.toString())
                        ? 'bg-[#84A59D] text-white border-[#84A59D]'
                        : 'bg-white border-slate-200 text-[#666] hover:border-[#84A59D]/50'
                    }`}
                  >
                    <Checkbox
                      id={`filter-building-${b.id}`}
                      checked={filterBuildings.includes(b.id.toString())}
                      onCheckedChange={(checked) => {
                        setFilterBuildings((prev) =>
                          checked
                            ? [...prev, b.id.toString()]
                            : prev.filter((id) => id !== b.id.toString())
                        )
                      }}
                      className="hidden"
                    />
                    {filterBuildings.includes(b.id.toString()) && <CheckCircle className="h-3.5 w-3.5" />}
                    {b.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Panel: เดือน */}
          {openFilter === 'month' && (
            <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[#666]">เลือกเดือน {filterMonths.length > 0 && <span className="text-[#84A59D]">({filterMonths.length})</span>}</p>
                {filterMonths.length > 0 && (
                  <button className="text-xs text-[#84A59D] hover:underline" onClick={() => setFilterMonths([])}>ล้าง</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {MONTHS.map((m) => (
                  <label
                    key={m.value}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer border transition-colors ${
                      filterMonths.includes(m.value.toString())
                        ? 'bg-[#84A59D] text-white border-[#84A59D]'
                        : 'bg-white border-slate-200 text-[#666] hover:border-[#84A59D]/50'
                    }`}
                  >
                    <Checkbox
                      checked={filterMonths.includes(m.value.toString())}
                      onCheckedChange={(checked) => {
                        setFilterMonths((prev) =>
                          checked
                            ? [...prev, m.value.toString()]
                            : prev.filter((v) => v !== m.value.toString())
                        )
                      }}
                      className="hidden"
                    />
                    {filterMonths.includes(m.value.toString()) && <CheckCircle className="h-3.5 w-3.5" />}
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Panel: เจ้าหนี้ */}
          {openFilter === 'creditor' && (
            <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[#666]">เลือกเจ้าหนี้ {filterCreditors.length > 0 && <span className="text-[#84A59D]">({filterCreditors.length})</span>}</p>
                {filterCreditors.length > 0 && (
                  <button className="text-xs text-[#84A59D] hover:underline" onClick={() => setFilterCreditors([])}>ล้าง</button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {CREDITORS.map((c) => (
                  <label
                    key={c.value}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer border transition-colors ${
                      filterCreditors.includes(c.value)
                        ? 'bg-[#84A59D] text-white border-[#84A59D]'
                        : 'bg-white border-slate-200 text-[#666] hover:border-[#84A59D]/50'
                    }`}
                  >
                    <Checkbox
                      checked={filterCreditors.includes(c.value)}
                      onCheckedChange={(checked) => {
                        setFilterCreditors((prev) =>
                          checked
                            ? [...prev, c.value]
                            : prev.filter((v) => v !== c.value)
                        )
                      }}
                      className="hidden"
                    />
                    {filterCreditors.includes(c.value) && <CheckCircle className="h-3.5 w-3.5" />}
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
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
        /* Summary Cards + Tables: 2 คอลัมน์ซ้าย-ขวา (desktop) / ซ้อนบน-ล่าง (mobile) */
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ซ้าย: ค้างจ่าย */}
          <div className="space-y-4">
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
                <p className="text-xs text-white/70 mt-1">บาท ({pendingItems.length} รายการ)</p>
              </CardContent>
            </Card>

            {/* Bulk Action Bar: ค้างจ่าย */}
            {selectedIds.size > 0 && (
              <Card className="border-0 shadow-lg bg-[#333] text-white">
                <CardContent className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-sm">
                    เลือก {selectedIds.size} รายการ
                    {' '}(รวม {formatNumber(pendingItems.filter((r) => selectedIds.has(r.id)).reduce((s, r) => s + Number(r.amount), 0))} บาท)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={bulkLoading}
                      onClick={handleBulkMarkReturned}
                    >
                      {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <CheckCircle className="mr-1 h-4 w-4" />
                      คืนเงินทั้งหมด
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {pendingItems.length === 0 ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center justify-center text-[#666]">
                    <CheckCircle className="h-8 w-8 mb-2 text-green-300" />
                    <p className="text-sm">ไม่มีรายการค้างจ่าย</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-red-50/50">
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={allPendingSelected ? true : somePendingSelected ? 'indeterminate' : false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds(new Set(pendingFilteredIds))
                              } else {
                                setSelectedIds(new Set())
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="text-[#333] font-semibold">วันที่ยืมจ่าย</TableHead>
                        <TableHead className="text-[#333] font-semibold">อาคาร</TableHead>
                        <TableHead className="text-[#333] font-semibold">ชื่อเจ้าหนี้</TableHead>
                        <TableHead className="text-[#333] font-semibold">รายละเอียด</TableHead>
                        <TableHead className="text-[#333] font-semibold text-right">จำนวนเงิน</TableHead>
                        <TableHead className="text-[#333] font-semibold text-center">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="w-[40px]">
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={(checked) => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev)
                                  if (checked) next.add(item.id)
                                  else next.delete(item.id)
                                  return next
                                })
                              }}
                            />
                          </TableCell>
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
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                onClick={() => handleMarkReturned(item)}
                                title="คืนเงินแล้ว"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
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

          {/* ขวา: คืนแล้ว */}
          <div className="space-y-4">
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
                <p className="text-xs text-white/70 mt-1">บาท ({returnedItems.length} รายการ)</p>
              </CardContent>
            </Card>

            {/* Bulk Action Bar: คืนแล้ว */}
            {selectedReturnedIds.size > 0 && (
              <Card className="border-0 shadow-lg bg-[#333] text-white">
                <CardContent className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-sm">
                    เลือก {selectedReturnedIds.size} รายการ
                    {' '}(รวม {formatNumber(returnedItems.filter((r) => selectedReturnedIds.has(r.id)).reduce((s, r) => s + Number(r.amount), 0))} บาท)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                      onClick={() => setSelectedReturnedIds(new Set())}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={bulkLoading}
                      onClick={handleBulkUndoReturned}
                    >
                      {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <RotateCcw className="mr-1 h-4 w-4" />
                      ยกเลิกคืนเงินทั้งหมด
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {returnedItems.length === 0 ? (
              <Card className="border-0 shadow-md">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center justify-center text-[#666]">
                    <HandCoins className="h-8 w-8 mb-2 text-slate-300" />
                    <p className="text-sm">ยังไม่มีรายการที่คืนแล้ว</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-50/50">
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={allReturnedSelected ? true : someReturnedSelected ? 'indeterminate' : false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedReturnedIds(new Set(returnedFilteredIds))
                              } else {
                                setSelectedReturnedIds(new Set())
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="text-[#333] font-semibold">วันที่คืนเงิน</TableHead>
                        <TableHead className="text-[#333] font-semibold">อาคาร</TableHead>
                        <TableHead className="text-[#333] font-semibold">ชื่อเจ้าหนี้</TableHead>
                        <TableHead className="text-[#333] font-semibold">รายละเอียด</TableHead>
                        <TableHead className="text-[#333] font-semibold text-right">จำนวนเงิน</TableHead>
                        <TableHead className="text-[#333] font-semibold text-center">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnedItems.map((item) => (
                        <TableRow key={item.id} className="bg-green-50/30">
                          <TableCell className="w-[40px]">
                            <Checkbox
                              checked={selectedReturnedIds.has(item.id)}
                              onCheckedChange={(checked) => {
                                setSelectedReturnedIds((prev) => {
                                  const next = new Set(prev)
                                  if (checked) next.add(item.id)
                                  else next.delete(item.id)
                                  return next
                                })
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(item.returnedDate)}
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
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-orange-500 hover:text-orange-600"
                                onClick={() => handleUndoReturned(item)}
                                title="ยกเลิกคืนเงิน"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
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
        </div>
      )}
    </div>
  )
}
