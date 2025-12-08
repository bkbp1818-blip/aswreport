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
import { getBuildingColor } from '@/lib/building-colors'

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
  const [activeTab, setActiveTab] = useState('building-settings')

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
        const errorData = await res.json().catch(() => ({}))
        if (res.status === 401) {
          alert('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล')
          window.location.href = '/access/partner'
          return
        }
        if (res.status === 403) {
          alert('เฉพาะ Partner เท่านั้นที่สามารถแก้ไขการตั้งค่าได้')
          return
        }
        throw new Error(errorData.error || 'Failed to save')
      }
      alert('บันทึกการตั้งค่าสำเร็จ')
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

  // สีของอาคารที่เลือก
  const buildingColor = selectedBuilding ? getBuildingColor(selectedBuilding) : '#84A59D'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#333] md:text-2xl">ตั้งค่า</h1>
        <p className="text-sm text-[#666] md:text-base">
          กำหนดค่าต่างๆ สำหรับแต่ละอาคาร
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white p-1 shadow-sm">
          <TabsTrigger
            value="building-settings"
            className="transition-colors duration-300"
            style={{
              backgroundColor: activeTab === 'building-settings' ? buildingColor : 'transparent',
              color: activeTab === 'building-settings' ? 'white' : undefined,
            }}
          >
            ตั้งค่าอาคาร
          </TabsTrigger>
          <TabsTrigger
            value="info"
            className="transition-colors duration-300"
            style={{
              backgroundColor: activeTab === 'info' ? buildingColor : 'transparent',
              color: activeTab === 'info' ? 'white' : undefined,
            }}
          >
            ข้อมูลอาคาร
          </TabsTrigger>
        </TabsList>

        <TabsContent value="building-settings" className="space-y-4">
          {/* เลือกอาคาร */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader
              className="text-white rounded-t-xl transition-colors duration-300"
              style={{ backgroundColor: buildingColor }}
            >
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                เลือกอาคาร
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="w-full sm:w-[300px]">
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
            </CardContent>
          </Card>

          {/* ตั้งค่า */}
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-[#666]">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader
                className="text-white transition-colors duration-300"
                style={{ backgroundColor: buildingColor }}
              >
                <CardTitle className="text-white">ค่าใช้จ่ายคงที่ - {selectedBuildingData?.name}</CardTitle>
                <CardDescription className="text-white/80">
                  กำหนดค่าใช้จ่ายประจำสำหรับอาคารนี้
                </CardDescription>
              </CardHeader>
              <CardContent
                className="space-y-6 p-6 transition-colors duration-300"
                style={{ background: `linear-gradient(to bottom, ${buildingColor}10, white)` }}
              >
                <div className="grid gap-4 sm:grid-cols-2 md:gap-6">
                  {/* Management Fee */}
                  <div className="space-y-2 rounded-lg border border-[#F6BD60]/30 bg-white p-4 shadow-sm">
                    <Label htmlFor="managementFee" className="text-[#D4A24C] font-semibold">
                      Management Fee (%)
                    </Label>
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
                      className="bg-[#F6BD60]/5 border-[#F6BD60]/30 focus:border-[#F6BD60] focus:ring-[#F6BD60]"
                    />
                    <p className="text-xs text-[#666]">
                      เปอร์เซ็นต์ค่าบริหารจัดการ (Roombix)
                    </p>
                    <p className="text-[10px] text-slate-400">
                      สูตร: = รายได้ค่าเช่า × {formData.managementFeePercent}%
                    </p>
                  </div>

                  {/* VAT */}
                  <div className="space-y-2 rounded-lg border border-[#84A59D]/30 bg-white p-4 shadow-sm">
                    <Label htmlFor="vat" className="text-[#84A59D] font-semibold">
                      VAT (%)
                    </Label>
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
                      className="bg-[#84A59D]/5 border-[#84A59D]/30 focus:border-[#84A59D] focus:ring-[#84A59D]"
                    />
                    <p className="text-xs text-[#666]">ภาษีมูลค่าเพิ่ม</p>
                  </div>

                  {/* Monthly Rent */}
                  <div className="space-y-2 rounded-lg border border-[#F28482]/30 bg-white p-4 shadow-sm">
                    <Label htmlFor="monthlyRent" className="text-[#F28482] font-semibold">
                      ค่าเช่าอาคาร/เดือน (บาท)
                    </Label>
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
                      className="bg-[#F28482]/5 border-[#F28482]/30 focus:border-[#F28482] focus:ring-[#F28482]"
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
                    className="shadow-lg transition-colors duration-300 hover:opacity-90"
                    style={{ backgroundColor: buildingColor }}
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
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#84A59D] to-[#6b8a84] text-white">
              <CardTitle className="text-white">ข้อมูลอาคารทั้งหมด</CardTitle>
              <CardDescription className="text-white/80">
                รายการอาคารที่มีในระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-gradient-to-b from-[#84A59D]/5 to-white">
              <div className="space-y-4">
                {buildings.map((building) => (
                  <div
                    key={building.id}
                    className="flex items-center justify-between rounded-xl border-2 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderColor: getBuildingColor(building.id) }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-white font-bold shadow-md"
                        style={{ backgroundColor: getBuildingColor(building.id) }}
                      >
                        {building.code}
                      </div>
                      <div>
                        <p className="font-semibold text-[#333]">{building.name}</p>
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
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#F28482] to-[#d96f6d] text-white">
              <CardTitle className="text-white">สูตรการคำนวณ</CardTitle>
              <CardDescription className="text-white/80">
                สูตรที่ใช้ในการคำนวณผลประกอบการ
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-gradient-to-b from-[#F28482]/5 to-white">
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border-l-4 border-l-[#84A59D] bg-[#84A59D]/10 p-4">
                  <p className="font-semibold text-[#84A59D]">รวมรายได้ค่าเช่า</p>
                  <p className="text-[#666] font-mono">= ผลรวมรายรับทั้งหมด</p>
                </div>
                <div className="rounded-lg border-l-4 border-l-[#F28482] bg-[#F28482]/10 p-4">
                  <p className="font-semibold text-[#F28482]">Gross Profit</p>
                  <p className="text-[#666] font-mono">= รวมรายได้ - รวมค่าใช้จ่าย</p>
                  <p className="text-xs text-slate-400 mt-1">(รวมค่าใช้จ่ายรวมค่าเช่าอาคารแล้ว)</p>
                </div>
                <div className="rounded-lg border-l-4 border-l-[#F6BD60] bg-[#F6BD60]/10 p-4">
                  <p className="font-semibold text-[#D4A24C]">Management Fee</p>
                  <p className="text-[#666] font-mono">= รายได้ค่าเช่า × 13.5%</p>
                  <p className="text-xs text-slate-400 mt-1">(เฉพาะรายได้ค่าเช่าเท่านั้น ไม่รวมค่าอาหาร, รับส่ง, ทัวร์)</p>
                </div>
                <div className="rounded-lg border-l-4 border-l-[#84A59D] bg-[#84A59D]/10 p-4">
                  <p className="font-semibold text-[#84A59D]">Net Profit for Owner</p>
                  <p className="text-[#666] font-mono">
                    = Gross Profit - Management Fee - VAT - Little Hotelier
                  </p>
                </div>
                <div className="rounded-lg border-l-4 border-l-[#F6BD60] bg-[#F6BD60]/10 p-4">
                  <p className="font-semibold text-[#D4A24C]">Amount to be Paid</p>
                  <p className="text-[#666] font-mono">= Management Fee × 1.07 (รวม VAT 7%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
