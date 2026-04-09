'use client'

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getEffectiveMenus } from '@/lib/menu-permissions'

export type Role = 'partner' | 'staff' | 'viewer' | null

export interface User {
  id: number
  username: string
  name: string
  role: 'PARTNER' | 'STAFF' | 'VIEWER'
  allowedMenus?: string[] | null
}

interface AccessContextType {
  role: Role
  user: User | null
  setRole: (role: Role) => void
  setUser: (user: User | null) => void
  login: (user: User) => void
  logout: () => void
  clearRole: () => void
  isLoading: boolean
  isPartner: boolean
  isStaff: boolean
  isViewer: boolean
  effectiveMenus: string[]
  hasMenuAccess: (path: string) => boolean
}

const AccessContext = createContext<AccessContextType | undefined>(undefined)

// Cookie helper functions
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

const setCookie = (name: string, value: string, days: number = 365) => {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(null)
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // โหลด role และ user จาก cookie เมื่อ mount
  useEffect(() => {
    const savedUser = getCookie('access_user')

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(savedUser))
        setUserState(parsedUser)
        // ดึง role จาก user data โดยตรง
        const roleFromUser: Role = parsedUser.role === 'PARTNER' ? 'partner' : parsedUser.role === 'VIEWER' ? 'viewer' : 'staff'
        setRoleState(roleFromUser)

        // ดึงข้อมูลล่าสุดจาก DB เพื่อ sync allowedMenus
        fetch('/api/auth/me')
          .then(res => res.ok ? res.json() : null)
          .then(freshUser => {
            if (freshUser) {
              const updatedUser = { ...parsedUser, allowedMenus: freshUser.allowedMenus }
              setUserState(updatedUser)
              // อัพเดท cookie ด้วยข้อมูลใหม่
              setCookie('access_user', encodeURIComponent(JSON.stringify(updatedUser)))
            }
          })
          .catch(() => {})
      } catch (e) {
        console.error('Error parsing user cookie:', e)
      }
    } else {
      // ถ้าไม่มี user cookie ให้ลองอ่านจาก access_role
      const savedRole = getCookie('access_role') as Role
      if (savedRole === 'partner' || savedRole === 'staff') {
        setRoleState(savedRole)
      }
    }

    setIsLoading(false)
  }, [])

  // คำนวณเมนูที่ผู้ใช้เข้าถึงได้จริง
  const effectiveMenus = useMemo(() => {
    if (!user) return []
    return getEffectiveMenus(user.role, user.allowedMenus ?? null)
  }, [user])

  const hasMenuAccess = (path: string): boolean => {
    if (role === 'partner') return true
    return effectiveMenus.includes(path)
  }

  // ตรวจสอบสิทธิ์และ redirect
  useEffect(() => {
    if (isLoading) return

    // หน้าที่ไม่ต้องตรวจสอบ (หน้า access)
    if (pathname?.startsWith('/access')) return

    // ถ้าไม่มี role → redirect ไปหน้าเลือก
    if (!role) {
      router.replace('/access')
      return
    }

    // Partner เข้าได้ทุกหน้า
    if (role === 'partner') return

    // ตรวจสอบสิทธิ์เมนูตาม effectiveMenus
    const hasAccess = effectiveMenus.some(
      menuPath => pathname === menuPath || pathname?.startsWith(menuPath + '/')
    )

    if (!hasAccess) {
      // redirect ไปเมนูแรกที่เข้าถึงได้ หรือ /transactions ถ้าไม่มีเลย
      const fallback = effectiveMenus[0] || '/transactions'
      router.replace(fallback)
    }
  }, [role, pathname, isLoading, router, effectiveMenus])

  const setRole = (newRole: Role) => {
    setRoleState(newRole)
    if (newRole) {
      setCookie('access_role', newRole)
    }
  }

  const setUser = (newUser: User | null) => {
    setUserState(newUser)
    if (newUser) {
      setCookie('access_user', encodeURIComponent(JSON.stringify(newUser)))
    } else {
      deleteCookie('access_user')
    }
  }

  const login = (userData: User) => {
    const roleValue: Role = userData.role === 'PARTNER' ? 'partner' : userData.role === 'VIEWER' ? 'viewer' : 'staff'
    setRole(roleValue)
    setUser(userData)
  }

  const logout = () => {
    setRoleState(null)
    setUserState(null)
    deleteCookie('access_role')
    deleteCookie('access_user')
  }

  const clearRole = () => {
    logout()
  }

  const value: AccessContextType = {
    role,
    user,
    setRole,
    setUser,
    login,
    logout,
    clearRole,
    isLoading,
    isPartner: role === 'partner',
    isStaff: role === 'staff',
    isViewer: role === 'viewer',
    effectiveMenus,
    hasMenuAccess,
  }

  return (
    <AccessContext.Provider value={value}>
      {children}
    </AccessContext.Provider>
  )
}

export function useAccess() {
  const context = useContext(AccessContext)
  if (context === undefined) {
    throw new Error('useAccess must be used within an AccessProvider')
  }
  return context
}
