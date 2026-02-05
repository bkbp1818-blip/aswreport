import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export interface AuthUser {
  id: number
  username: string
  name: string
  role: 'PARTNER' | 'STAFF' | 'VIEWER'
}

/**
 * ดึงข้อมูล user ที่ login อยู่จาก cookie
 * @returns AuthUser หรือ null ถ้าไม่ได้ login
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const userCookie = cookieStore.get('access_user')

    if (!userCookie?.value) {
      return null
    }

    const user = JSON.parse(decodeURIComponent(userCookie.value))

    // ตรวจสอบว่า user ยังมีอยู่ใน DB และ isActive
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, username: true, name: true, role: true, isActive: true }
    })

    if (!dbUser || !dbUser.isActive) {
      return null
    }

    return {
      id: dbUser.id,
      username: dbUser.username,
      name: dbUser.name,
      role: dbUser.role
    }
  } catch {
    return null
  }
}

/**
 * ตรวจสอบว่าเป็น Partner หรือไม่
 * @throws Error ถ้าไม่ได้ login หรือไม่ใช่ Partner
 */
export async function requirePartner(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')
  if (user.role !== 'PARTNER') throw new Error('Forbidden')
  return user
}

/**
 * ตรวจสอบว่า login อยู่หรือไม่ (Partner หรือ Staff ก็ได้)
 * @throws Error ถ้าไม่ได้ login
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

/**
 * Helper function สำหรับจัดการ auth error ใน API routes
 */
export function handleAuthError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return { error: 'กรุณาเข้าสู่ระบบ', status: 401 }
    }
    if (error.message === 'Forbidden') {
      return { error: 'ไม่มีสิทธิ์เข้าถึง', status: 403 }
    }
  }
  return null
}
