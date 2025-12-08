'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccess, User } from '@/contexts/AccessContext'
import { Building2, Lock, User as UserIcon, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function StaffAccessPage() {
  const { login } = useAccess()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          role: 'STAFF',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด')
        setIsLoading(false)
        return
      }

      // Login สำเร็จ
      const userData: User = {
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role,
      }

      login(userData)
      // ใช้ window.location.href เพื่อ refresh เต็มรูปแบบ ให้ cookie ถูกอ่านใหม่
      window.location.href = '/transactions'
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7EDE2] p-4">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div className="flex items-center gap-3 rounded-full bg-[#F28482] p-4">
          <Building2 className="h-12 w-12 text-white" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#F28482]">ARUN SA WAD</h1>
        <p className="text-sm text-slate-500">เข้าสู่ระบบสำหรับพนักงาน</p>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-[#F28482] focus:outline-none focus:ring-1 focus:ring-[#F28482]"
                placeholder="กรอก username"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-10 text-sm focus:border-[#F28482] focus:outline-none focus:ring-1 focus:ring-[#F28482]"
                placeholder="กรอก password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-[#F28482] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#d96f6d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Back Link */}
        <div className="mt-4 text-center">
          <a
            href="/access"
            className="text-sm text-slate-500 hover:text-[#F28482] hover:underline"
          >
            กลับไปหน้าเลือก
          </a>
        </div>
      </div>
    </div>
  )
}
