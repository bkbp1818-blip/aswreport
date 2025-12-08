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
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Loader2, Users, UserCheck, UserX, Eye, EyeOff } from 'lucide-react'

interface User {
  id: number
  username: string
  name: string
  role: 'PARTNER' | 'STAFF'
  isActive: boolean
  createdAt: string
}

const roleLabels: Record<string, string> = {
  PARTNER: 'หุ้นส่วน',
  STAFF: 'พนักงาน',
}

const roleColors: Record<string, { bg: string; text: string }> = {
  PARTNER: { bg: 'bg-[#84A59D]', text: 'text-white' },
  STAFF: { bg: 'bg-[#F28482]', text: 'text-white' },
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'STAFF' as 'PARTNER' | 'STAFF',
  })

  // โหลดข้อมูล users
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (!res.ok) {
        throw new Error('Failed to fetch')
      }
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Reset form
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'STAFF',
    })
    setEditingUser(null)
    setShowPassword(false)
  }

  // เปิด dialog สำหรับแก้ไข
  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '', // ไม่แสดง password เดิม
      name: user.name,
      role: user.role,
    })
    setIsDialogOpen(true)
  }

  // บันทึก user
  const handleSave = async () => {
    if (!formData.name) {
      alert('กรุณากรอกชื่อ')
      return
    }

    if (!editingUser && (!formData.username || !formData.password)) {
      alert('กรุณากรอก Username และ Password')
      return
    }

    setSaving(true)
    try {
      const method = editingUser ? 'PUT' : 'POST'
      const body = editingUser
        ? {
            id: editingUser.id,
            name: formData.name,
            role: formData.role,
            ...(formData.password ? { password: formData.password } : {}),
          }
        : formData

      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      await loadUsers()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving user:', error)
      alert(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  // ลบ user
  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`คุณต้องการลบ user "${username}" หรือไม่?`)) {
      return
    }

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }

      await loadUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบ')
    }
  }

  // Toggle active status
  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          isActive: !user.isActive,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update')
      }

      await loadUsers()
    } catch (error) {
      console.error('Error toggling active:', error)
      alert('เกิดข้อผิดพลาดในการอัพเดท')
    }
  }

  // นับจำนวน users ตาม role
  const partnerCount = users.filter((u) => u.role === 'PARTNER').length
  const staffCount = users.filter((u) => u.role === 'STAFF').length
  const activeCount = users.filter((u) => u.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#333] md:text-2xl">จัดการผู้ใช้</h1>
          <p className="text-sm text-[#666] md:text-base">
            เพิ่ม แก้ไข และจัดการบัญชีผู้ใช้งาน
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-[#84A59D] hover:bg-[#6b8a84]">
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มผู้ใช้
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'แก้ไขข้อมูลผู้ใช้ (เว้น password ไว้ถ้าไม่ต้องการเปลี่ยน)'
                  : 'กรอกข้อมูลผู้ใช้ให้ครบถ้วน'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, username: e.target.value }))
                  }
                  placeholder="username"
                  disabled={!!editingUser}
                />
                {editingUser && (
                  <p className="text-xs text-slate-500">ไม่สามารถแก้ไข username ได้</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editingUser ? '(เว้นไว้ถ้าไม่เปลี่ยน)' : '*'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder={editingUser ? '••••••••' : 'password'}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อที่แสดง *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="ชื่อ-นามสกุล หรือชื่อเล่น"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">บทบาท *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      role: value as 'PARTNER' | 'STAFF',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARTNER">หุ้นส่วน (เข้าถึงทุกหน้า)</SelectItem>
                    <SelectItem value="STAFF">พนักงาน (เฉพาะกรอกข้อมูล)</SelectItem>
                  </SelectContent>
                </Select>
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
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingUser ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-[#84A59D] to-[#6b8a84] text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              ผู้ใช้ทั้งหมด
            </CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{users.length} คน</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-[#1d3557] to-[#457b9d] text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">หุ้นส่วน</CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{partnerCount} คน</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-[#F28482] to-[#d96f6d] text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">พนักงาน</CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{staffCount} คน</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-[#F6BD60] to-[#e5a84a] text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              ใช้งานได้
            </CardTitle>
            <div className="rounded-full bg-white/20 p-1.5">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeCount} คน</div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      {loading ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#84A59D]" />
              <span className="ml-2 text-[#666]">กำลังโหลดข้อมูล...</span>
            </div>
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-[#666]">
              <Users className="h-12 w-12 mb-4 text-slate-300" />
              <p>ยังไม่มีข้อมูลผู้ใช้</p>
              <p className="text-sm">คลิกปุ่ม &quot;เพิ่มผู้ใช้&quot; เพื่อเริ่มต้น</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="bg-[#84A59D] text-white">
            <CardTitle className="text-lg">รายชื่อผู้ใช้</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {users.map((user, index) => (
                <div
                  key={user.id}
                  className={`p-4 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  } hover:bg-slate-100 transition-colors`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#333]">{user.name}</p>
                        <Badge
                          className={`${roleColors[user.role].bg} ${roleColors[user.role].text}`}
                        >
                          {roleLabels[user.role]}
                        </Badge>
                        {!user.isActive && (
                          <Badge variant="outline" className="text-red-500 border-red-300">
                            ปิดใช้งาน
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Username: <span className="font-mono">{user.username}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${
                          user.isActive
                            ? 'text-green-600 hover:text-green-700'
                            : 'text-red-500 hover:text-red-600'
                        }`}
                        onClick={() => handleToggleActive(user)}
                        title={user.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      >
                        {user.isActive ? (
                          <UserCheck className="h-4 w-4" />
                        ) : (
                          <UserX className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-[#84A59D]"
                        onClick={() => handleEdit(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-red-500"
                        onClick={() => handleDelete(user.id, user.username)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-0 shadow-md bg-[#F6BD60]/10 border-[#F6BD60]">
        <CardHeader>
          <CardTitle className="text-[#333]">หมายเหตุ</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#666] space-y-2">
          <p>
            <strong>หุ้นส่วน (Partner)</strong> - สามารถเข้าถึงได้ทุกหน้า รวมถึง Dashboard,
            รายงาน, ตั้งค่า และจัดการผู้ใช้
          </p>
          <p>
            <strong>พนักงาน (Staff)</strong> - สามารถเข้าถึงได้เฉพาะหน้ากรอกข้อมูลรายรับ-รายจ่าย
          </p>
          <p className="text-orange-600">
            * การปิดใช้งานผู้ใช้จะทำให้ผู้ใช้นั้นไม่สามารถเข้าสู่ระบบได้
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
