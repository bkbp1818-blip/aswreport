// Helper ฝั่ง UI ของหน้าตารางเวลางาน (client) — co-located ใต้ src/app/schedule/

export const SCHEDULE_MIN_DATE_ISO = '2026-07-01'
// วันจันทร์ของสัปดาห์ที่มี 1 ก.ค. 2026 (2026-07-01 เป็นวันพุธ → จันทร์คือ 2026-06-29)
export const MIN_WEEK_START = '2026-06-29'

// ป้ายวันในสัปดาห์ (0=จันทร์ ... 6=อาทิตย์)
export const WEEKDAY_SHORT = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']
export const WEEKDAY_FULL = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

/** บวก/ลบวันจากสตริง 'YYYY-MM-DD' (คำนวณแบบ UTC กันปัญหา timezone) */
export function addDaysISO(iso: string, n: number): string {
  const [y, mo, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d + n))
  return isoFromUTC(dt)
}

function isoFromUTC(dt: Date): string {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

/** วันจันทร์ของสัปดาห์ปัจจุบัน (clamp ไม่ให้ก่อน MIN_WEEK_START) */
export function defaultWeekStart(): string {
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // 0=จันทร์
  const mon = new Date(now)
  mon.setDate(now.getDate() - day)
  const iso = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
  return iso < MIN_WEEK_START ? MIN_WEEK_START : iso
}

/** 'YYYY-MM-DD' → '1 ก.ค.' */
export function formatThaiDate(iso: string): string {
  const [, mo, d] = iso.split('-').map(Number)
  return `${d} ${THAI_MONTHS[mo - 1]}`
}

/** 'YYYY-MM-DD' → '1 ก.ค. 2026' */
export function formatThaiDateFull(iso: string): string {
  const [y, mo, d] = iso.split('-').map(Number)
  return `${d} ${THAI_MONTHS[mo - 1]} ${y}`
}

/** ฟอร์แมตชั่วโมงให้อ่านง่าย เช่น 9, 8.5 */
export function formatHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(1)
}
