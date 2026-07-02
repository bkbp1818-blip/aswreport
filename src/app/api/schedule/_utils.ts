// ────────────────────────────────────────────────────────────────────────────
// Helper สำหรับฟีเจอร์ "ตารางเวลางานพนักงาน" (Staff Schedule)
// - display/วางแผนกะเท่านั้น แยกจากระบบการเงินทั้งหมด
// - เก็บ/แก้ไขได้เฉพาะวันที่ >= 2026-07-01 (กค 2569) เท่านั้น
// - ไฟล์นี้ co-located อยู่ใต้ src/app/api/schedule/ (ไฟล์ _ ไม่ใช่ route)
// ────────────────────────────────────────────────────────────────────────────

// วันเริ่มใช้ตารางเวลา — 1 ก.ค. 2026 (กค 2569). ก่อนหน้านี้ห้ามเขียน/แก้ไข
export const SCHEDULE_MIN_DATE_ISO = '2026-07-01'
export const SCHEDULE_MIN_DATE = new Date(Date.UTC(2026, 6, 1)) // month index 6 = กรกฎาคม

/**
 * แปลงสตริง 'YYYY-MM-DD' เป็น Date ที่ UTC midnight (ตรงกับ @db.Date ของ Prisma)
 * คืน null ถ้ารูปแบบไม่ถูกต้อง
 */
export function parseISODateUTC(input: string | null | undefined): Date | null {
  if (!input) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim())
  if (!m) return null
  const year = parseInt(m[1])
  const month = parseInt(m[2])
  const day = parseInt(m[3])
  const d = new Date(Date.UTC(year, month - 1, day))
  // ตรวจว่าค่าที่ได้ตรงกับ input จริง (กันวันที่ไม่มีอยู่จริง เช่น 2026-02-31)
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null
  }
  return d
}

/** true ถ้าวันที่นี้อยู่ก่อนวันเริ่มใช้ตาราง (แก้ไม่ได้) */
export function isBeforeMinDate(date: Date): boolean {
  return date.getTime() < SCHEDULE_MIN_DATE.getTime()
}

/** แปลง Date เป็น 'YYYY-MM-DD' (อ้างอิง UTC) */
export function formatDateISO(date: Date): string {
  const y = date.getUTCFullYear()
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

/** weekday แบบเริ่มวันจันทร์: 0=จันทร์, 1=อังคาร, ..., 6=อาทิตย์ */
export function dateToWeekday(date: Date): number {
  return (date.getUTCDay() + 6) % 7 // getUTCDay(): 0=อาทิตย์ → แปลงให้ 0=จันทร์
}

/** บวกวัน (UTC) */
export function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

/** หาวันจันทร์ของสัปดาห์ที่วันที่นี้อยู่ (UTC) */
export function startOfWeekMonday(date: Date): Date {
  const wd = dateToWeekday(date)
  return addDaysUTC(date, -wd)
}

/** แปลง 'HH:mm' เป็นนาทีตั้งแต่เที่ยงคืน คืน null ถ้ารูปแบบผิด */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return null
  const h = parseInt(m[1])
  const min = parseInt(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

/**
 * คำนวณชั่วโมงทำงานของกะหนึ่ง (start → end)
 * - เป็นวันหยุด หรือไม่มีเวลาเริ่ม/เลิก → 0
 * - ถ้า end <= start ถือว่าข้ามคืน (+24 ชม.)
 */
export function computeShiftHours(
  startTime: string | null,
  endTime: string | null,
  isDayOff: boolean
): number {
  if (isDayOff) return 0
  const s = timeToMinutes(startTime)
  const e = timeToMinutes(endTime)
  if (s === null || e === null) return 0
  let diff = e - s
  if (diff <= 0) diff += 24 * 60 // ข้ามเที่ยงคืน
  return diff / 60
}

/** ตรวจ/normalize รูปแบบเวลา 'HH:mm' ให้เป็น 'HH:mm' (2 หลัก) หรือ null */
export function normalizeTime(time: unknown): string | null {
  if (typeof time !== 'string') return null
  const mins = timeToMinutes(time)
  if (mins === null) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
