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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, Loader2, Building2 } from 'lucide-react'

interface Building {
  id: number
  name: string
  code: string
}

interface Settings {
  id: number
  buildingId: number
  managementFeePercent: number
  vatPercent: number
  monthlyRent: number
  littleHotelierExpense: number
  building?: Building
}

export default function SettingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    managementFeePercent: 13.5,
    vatPercent: 7,
    monthlyRent: 0,
  })

  // โหลดรายการอาคาร
  useEffect(() => {
    fetch('/api/buildings')
      .then((res) => res.json())
      .then((data) => {
        setBuildings(data)
        if (data.length > 0) {
          setSelectedBuilding(String(data[0].id))
        }
      })
      .catch((err) => console.error('Error loading buildings:', err))
      .finally(() => setLoading(false))
  }, [])

  // โหลด settings เมื่อเลือกอาคาร
  useEffect(() => {
    if (!selectedBuilding) return

    setLoading(true)
    fetch(`/api/settings?buildingId=${selectedBuilding}`)
      .then((res) => res.json())
      .then((data) => {
        setSettings(data)
        if (data) {
          setFormData({
            managementFeePercent: Number(data.managementFeePercent) || 13.5,
            vatPercent: Number(data.vatPercent) || 7,
            monthlyRent: Number(data.monthlyRent) || 0,
          })
        }
      })
      .catch((err) => console.error('Error loading settings:', err))
      .finally(() => setLoading(false))
  }, [selectedBuilding])

  const handleSave = async () => {
    if (!selectedBuilding) return

    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: selectedBuilding,
          ...formData,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save')
      }

      alert('บันทึกการตั้งค่าสำเร็จ!')
    } catch (err) {
      console.error('Error saving:', err)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  const selectedBuildingData = buildings.find(
    (b) => String(b.id) === selectedBuilding
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#333]">ตั้งค่า</h1>
        <p className="text-[#666]">
          กำหนดค่าต่างๆ สำหรับแต่ละอาคาร
        </p>
      </div>

      <Tabs defaultValue="building-settings" className="space-y-4">
        <TabsList className="bg-white">
          <TabsTrigger value="building-settings">ตั้งค่าอาคาร</TabsTrigger>
          <TabsTrigger value="info">ข้อมูลอาคาร</TabsTrigger>
        </TabsList>

        <TabsContent value="building-settings" className="space-y-4">
          {/* เลือกอาคาร */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-[#84A59D] text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                เลือกอาคาร
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="w-full md:w-[300px]">
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
            </CardContent>
          </Card>

          {/* ตั้งค่า */}
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-[#666]">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>ค่าใช้จ่ายคงที่ - {selectedBuildingData?.name}</CardTitle>
                <CardDescription>
                  กำหนดค่าใช้จ่ายประจำสำหรับอาคารนี้
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Management Fee */}
                  <div className="space-y-2">
                    <Label htmlFor="managementFee">Management Fee (%)</Label>
                    <Input
                      id="managementFee"
                      type="number"
                      step="0.1"
                      value={formData.managementFeePercent}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          managementFeePercent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="bg-white"
                    />
                    <p className="text-xs text-[#666]">
                      เปอร์เซ็นต์ค่าบริหารจัดการ (Roombix)
                    </p>
                  </div>

                  {/* VAT */}
                  <div className="space-y-2">
                    <Label htmlFor="vat">VAT (%)</Label>
                    <Input
                      id="vat"
                      type="number"
                      step="0.1"
                      value={formData.vatPercent}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          vatPercent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="bg-white"
                    />
                    <p className="text-xs text-[#666]">ภาษีมูลค่าเพิ่ม</p>
                  </div>

                  {/* Monthly Rent */}
                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">ค่าเช่าอาคาร/เดือน (บาท)</Label>
                    <Input
                      id="monthlyRent"
                      type="number"
                      value={formData.monthlyRent}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          monthlyRent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="bg-white"
                    />
                    <p className="text-xs text-[#666]">
                      ค่าเช่าอาคารรายเดือน
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#84A59D] hover:bg-[#6b8a84]"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    บันทึกการตั้งค่า
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>ข้อมูลอาคารทั้งหมด</CardTitle>
              <CardDescription>
                รายการอาคารที่มีในระบบ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {buildings.map((building) => (
                  <div
                    key={building.id}
                    className="flex items-center justify-between rounded-lg border border-[#E8DED5] bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#84A59D] text-white font-bold">
                        {building.code}
                      </div>
                      <div>
                        <p className="font-medium text-[#333]">{building.name}</p>
                        <p className="text-sm text-[#666]">
                          รหัส: {building.code}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Formula Info */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>สูตรการคำนวณ</CardTitle>
              <CardDescription>
                สูตรที่ใช้ในการคำนวณผลประกอบการ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 font-mono text-sm">
                <div className="rounded-lg bg-[#F5CAC3]/30 p-3">
                  <p className="font-medium text-[#333]">รวมรายได้ค่าเช่า</p>
                  <p className="text-[#666]">= ผลรวมรายรับทั้งหมด</p>
                </div>
                <div className="rounded-lg bg-[#F5CAC3]/30 p-3">
                  <p className="font-medium text-[#333]">Gross Profit</p>
                  <p className="text-[#666]">= รวมรายได้ค่าเช่า - รวมค่าใช้จ่าย</p>
                </div>
                <div className="rounded-lg bg-[#F6BD60]/30 p-3">
                  <p className="font-medium text-[#333]">Management Fee</p>
                  <p className="text-[#666]">= รวมรายได้ค่าเช่า × 13.5%</p>
                </div>
                <div className="rounded-lg bg-[#84A59D]/30 p-3">
                  <p className="font-medium text-[#333]">Net Profit for Owner</p>
                  <p className="text-[#666]">
                    = Gross Profit - Management Fee - ค่าเช่าอาคาร
                  </p>
                </div>
                <div className="rounded-lg bg-[#84A59D]/30 p-3">
                  <p className="font-medium text-[#333]">Amount to be Paid</p>
                  <p className="text-[#666]">= Management Fee × 1.07 (รวม VAT 7%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
