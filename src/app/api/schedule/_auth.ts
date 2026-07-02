// role gate สำหรับฟีเจอร์ตารางเวลางาน — reuse ระบบ auth เดิม (import อย่างเดียว ไม่แก้)
import { requireAuth, type AuthUser } from '@/lib/auth'

// เมนูใหม่ของฟีเจอร์นี้ (เพิ่มใน menu-permissions.ts แบบ additive — ใช้แสดง nav ใน frontend)
export const SCHEDULE_MENU_KEY = '/schedule'

/** อ่านตารางเวลา — ดูได้ทุกคนที่ login (รวม VIEWER) */
export async function requireScheduleRead(): Promise<AuthUser> {
  return requireAuth()
}

/** แก้ตารางเวลา — ต้อง login และห้ามเป็น VIEWER (PARTNER/STAFF แก้ได้, VIEWER ดูอย่างเดียว) */
export async function requireScheduleWrite(): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.role === 'VIEWER') throw new Error('Forbidden')
  return user
}
