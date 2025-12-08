'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export type Role = 'partner' | 'staff' | null

export interface User {
  id: number
  username: string
  name: string
  role: 'PARTNER' | 'STAFF'
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
        const roleFromUser: Role = parsedUser.role === 'PARTNER' ? 'partner' : 'staff'
        setRoleState(roleFromUser)
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

    // ถ้าเป็น staff และพยายามเข้าหน้าอื่น → redirect ไป transactions
    if (role === 'staff') {
      const allowedPaths = ['/transactions', '/settings']
      const isAllowed = allowedPaths.some(path => pathname === path || pathname?.startsWith(path + '/'))

      if (!isAllowed) {
        router.replace('/transactions')
      }
    }
  }, [role, pathname, isLoading, router])

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
    const roleValue: Role = userData.role === 'PARTNER' ? 'partner' : 'staff'
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
