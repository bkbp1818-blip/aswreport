// รายการเมนูทั้งหมดในระบบ
export const MENU_ITEMS = [
  { key: '/', label: 'Dashboard' },
  { key: '/transactions', label: 'กรอกข้อมูล' },
  { key: '/employees', label: 'เงินเดือนพนักงาน' },
  { key: '/reimbursements', label: 'ยอดค้างจ่ายคืน' },
  { key: '/users', label: 'จัดการผู้ใช้' },
  { key: '/settings', label: 'จัดการค่าใช้จ่ายส่วนกลาง' },
] as const

// เมนูที่จำกัดเฉพาะ PARTNER เท่านั้น (ไม่สามารถให้คนอื่นเข้าได้)
export const PARTNER_ONLY_MENUS = ['/users']

// ค่า default ของเมนูตาม role (ใช้เมื่อ allowedMenus เป็น null)
export const DEFAULT_MENUS_BY_ROLE: Record<string, string[]> = {
  PARTNER: ['/', '/transactions', '/employees', '/reimbursements', '/users', '/settings'],
  STAFF: ['/transactions', '/settings'],
  VIEWER: ['/transactions', '/settings'],
}

/**
 * คำนวณเมนูที่ผู้ใช้เข้าถึงได้จริง
 * - PARTNER ได้ทุกเมนูเสมอ
 * - ถ้า allowedMenus เป็น null → ใช้ค่า default ตาม role
 * - ถ้า allowedMenus มีค่า → ใช้ตามที่กำหนด แต่กรอง partner-only menus ออก
 */
export function getEffectiveMenus(role: string, allowedMenus: string[] | null): string[] {
  if (role === 'PARTNER') return DEFAULT_MENUS_BY_ROLE.PARTNER
  if (!allowedMenus) return DEFAULT_MENUS_BY_ROLE[role] || []
  return allowedMenus.filter(m => !PARTNER_ONLY_MENUS.includes(m))
}

/**
 * ตรวจสอบว่า allowedMenus ที่ส่งมาถูกต้องหรือไม่
 */
export function validateAllowedMenus(menus: unknown): menus is string[] {
  if (!Array.isArray(menus)) return false
  const validKeys: string[] = MENU_ITEMS.map(m => m.key)
  return menus.every(m => typeof m === 'string' && validKeys.includes(m))
}
