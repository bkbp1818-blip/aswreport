'use client'

import { useEffect, useState, useCallback } from 'react'
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
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Loader2, DoorOpen } from 'lucide-react'

interface Building {
  id: number
  name: string
  code: string
}

interface Room {
  id: number
  buildingId: number
  name: string
  note: string | null
  order: number
  isActive: boolean
}

const FUNN_BUILDING_CODES = ['FUNNLP', 'FUNNS81']

export default function RoomsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formNote, setFormNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const selectedBuilding = buildings.find((b) => String(b.id) === selectedBuildingId)
  const selectedBuildingCode = selectedBuilding?.code || ''
  const isFunnBuilding = FUNN_BUILDING_CODES.includes(selectedBuildingCode)

  // โหลดรายการอาคาร
  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/buildings')
      const data = await res.json()
      setBuildings(data)
      if (data.length > 0 && !selectedBuildingId) {
        const firstNonFunn = data.find((b: Building) => !FUNN_BUILDING_CODES.includes(b.code))
        setSelectedBuildingId(String(firstNonFunn?.id ?? data[0].id))
      }
    }
    load().catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // โหลดห้องของอาคารที่เลือก
  const loadRooms = useCallback(async () => {
    if (!selectedBuildingId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/rooms?buildingId=${selectedBuildingId}&includeInactive=true`)
      const data = await res.json()
      setRooms(data)
    } catch (e) {
      console.error('loadRooms error', e)
    } finally {
      setLoading(false)
    }
  }, [selectedBuildingId])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  const openAddDialog = () => {
    setEditingId(null)
    setFormName('')
    setFormNote('')
    setDialogOpen(true)
  }

  const openEditDialog = (r: Room) => {
    setEditingId(r.id)
    setFormName(r.name)
    setFormNote(r.note || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      alert('กรุณากรอกชื่อห้อง')
      return
    }
    setSaving(true)
    try {
      const body = JSON.stringify({
        buildingId: parseInt(selectedBuildingId),
        name: formName.trim(),
        note: formNote.trim() || null,
      })
      const res = editingId
        ? await fetch(`/api/rooms/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body,
          })
        : await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`บันทึกไม่สำเร็จ: ${err.error || res.statusText}`)
        return
      }
      setDialogOpen(false)
      await loadRooms()
    } catch (e) {
      console.error('handleSave error', e)
      alert('เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (r: Room) => {
    if (!confirm(`ยืนยันการลบห้อง "${r.name}" ?\n\nหมายเหตุ: ระบบจะซ่อนห้องนี้ออกจาก dropdown แต่ประวัติการกรอกเก่ายังคงอยู่`)) return
    setDeletingId(r.id)
    try {
      const res = await fetch(`/api/rooms/${r.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`ลบไม่สำเร็จ: ${err.error || res.statusText}`)
        return
      }
      await loadRooms()
    } catch (e) {
      console.error('handleDelete error', e)
      alert('เกิดข้อผิดพลาดในการลบ')
    } finally {
      setDeletingId(null)
    }
  }

  const handleReactivate = async (r: Room) => {
    try {
      const res = await fetch(`/api/rooms/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`เปิดใช้งานไม่สำเร็จ: ${err.error || res.statusText}`)
        return
      }
      await loadRooms()
    } catch (e) {
      console.error('handleReactivate error', e)
    }
  }

  const activeRooms = rooms.filter((r) => r.isActive)
  const inactiveRooms = rooms.filter((r) => !r.isActive)

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <DoorOpen className="h-6 w-6 text-[#84A59D]" />
        <h1 className="text-2xl md:text-3xl font-bold">จัดการห้อง</h1>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-[#84A59D] to-[#6b8a84] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-white">ห้องในแต่ละอาคาร</CardTitle>
            <CardDescription className="text-white/80">
              พนักงานเลือกห้องตอนกรอก Direct Booking และ OTA — เฉพาะ PARTNER จัดการได้
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
              <SelectTrigger className="bg-white text-gray-900 sm:w-[220px]">
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
            {!isFunnBuilding && selectedBuildingId && (
              <Button onClick={openAddDialog} className="bg-white text-[#5a7d75] hover:bg-gray-100">
                <Plus className="h-4 w-4 mr-1" /> เพิ่มห้อง
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {isFunnBuilding ? (
            <div className="text-center py-12 text-gray-500">
              <DoorOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-base">อาคารนี้ไม่มีห้องแยก</p>
              <p className="text-sm mt-1">FUNN Day (สุขุมวิท 81 / ลาดพร้าว) ไม่ต้องระบุห้องตอนกรอกข้อมูล</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#84A59D]" />
            </div>
          ) : (
            <>
              {activeRooms.length === 0 && inactiveRooms.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>ยังไม่มีห้องในอาคารนี้ — กดปุ่ม "เพิ่มห้อง" ด้านบนเพื่อเริ่มต้น</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>ชื่อห้อง</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                      <TableHead className="w-[140px] text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRooms.map((r, idx) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{r.note || '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-100"
                              onClick={() => openEditDialog(r)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:bg-red-100"
                              disabled={deletingId === r.id}
                              onClick={() => handleDelete(r)}
                            >
                              {deletingId === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {inactiveRooms.length > 0 && (
                      <>
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={4} className="text-xs text-gray-500 font-semibold">
                            ห้องที่ปิดใช้งาน (ประวัติยังคงอยู่)
                          </TableCell>
                        </TableRow>
                        {inactiveRooms.map((r) => (
                          <TableRow key={r.id} className="bg-gray-50 text-gray-400">
                            <TableCell className="line-through">—</TableCell>
                            <TableCell className="line-through">{r.name}</TableCell>
                            <TableCell className="line-through text-sm">{r.note || '—'}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReactivate(r)}
                              >
                                เปิดใช้งาน
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'แก้ไขห้อง' : 'เพิ่มห้องใหม่'}</DialogTitle>
            <DialogDescription>
              อาคาร: <span className="font-medium">{selectedBuilding?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="room-name">ชื่อห้อง *</Label>
              <Input
                id="room-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="เช่น 101, 138A, 1"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="room-note">หมายเหตุ (ไม่บังคับ)</Label>
              <textarea
                id="room-note"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="เช่น ระบุชั้น / ประเภท / จำนวนเตียง"
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#84A59D] hover:bg-[#6b8a84]">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> กำลังบันทึก...
                </>
              ) : (
                'บันทึก'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
