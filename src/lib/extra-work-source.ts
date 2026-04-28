/**
 * ดึงยอดงานเสริม FD จากระบบ leave (https://leave-bay.vercel.app)
 *
 * - cache 60 วินาที per (month, year)
 * - timeout 4 วินาที + retry 1 ครั้ง (เฉพาะ network error / 5xx)
 * - stale-while-error: ถ้า fetch fail แต่มี cache อายุ <10 นาที จะคืน cache เก่า
 * - ไม่ throw — กรณีล้มเหลวจะคืน { fdExtraLadpraoIncome: 0, fdExtraSukhumvitIncome: 0, source: 'fallback' }
 */

export type ExtraWorkSource = 'leave' | 'stale' | 'fallback' | 'legacy'

export interface ExtraWorkIncome {
  month: number
  year: number
  fdExtraLadpraoIncome: number
  fdExtraSukhumvitIncome: number
  raw: { ladprao: number; sukhumvit: number }
  source: ExtraWorkSource
  fetchedAt: string
  error?: string
}

interface CacheEntry {
  data: ExtraWorkIncome
  cachedAt: number
}

const FRESH_TTL_MS = 60 * 1000
const STALE_TTL_MS = 10 * 60 * 1000
const FETCH_TIMEOUT_MS = 4000

const cache = new Map<string, CacheEntry>()

function cacheKey(month: number, year: number): string {
  return `${year}-${month}`
}

function emptyResult(
  month: number,
  year: number,
  source: ExtraWorkSource,
  error?: string
): ExtraWorkIncome {
  return {
    month,
    year,
    fdExtraLadpraoIncome: 0,
    fdExtraSukhumvitIncome: 0,
    raw: { ladprao: 0, sukhumvit: 0 },
    source,
    fetchedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  }
}

async function fetchOnce(
  month: number,
  year: number
): Promise<ExtraWorkIncome> {
  const baseUrl = process.env.LEAVE_API_BASE_URL
  const apiKey = process.env.LEAVE_SHARED_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('LEAVE_API_BASE_URL / LEAVE_SHARED_API_KEY not configured')
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/public/extra-work/summary?month=${month}&year=${year}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!res.ok) {
      const retryable = res.status === 502 || res.status === 503 || res.status === 504
      const err = new Error(`leave api ${res.status}`)
      ;(err as Error & { retryable?: boolean }).retryable = retryable
      throw err
    }

    const json = (await res.json()) as {
      success: boolean
      ladprao?: { rawTotal: number; perBuilding: number }
      sukhumvit?: { rawTotal: number; perBuilding: number }
    }

    if (!json.success || !json.ladprao || !json.sukhumvit) {
      throw new Error('leave api invalid payload')
    }

    return {
      month,
      year,
      fdExtraLadpraoIncome: Math.max(0, json.ladprao.perBuilding),
      fdExtraSukhumvitIncome: Math.max(0, json.sukhumvit.perBuilding),
      raw: {
        ladprao: Math.max(0, json.ladprao.rawTotal),
        sukhumvit: Math.max(0, json.sukhumvit.rawTotal),
      },
      source: 'leave',
      fetchedAt: new Date().toISOString(),
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchWithRetry(
  month: number,
  year: number
): Promise<ExtraWorkIncome> {
  try {
    return await fetchOnce(month, year)
  } catch (e) {
    const err = e as Error & { retryable?: boolean; name?: string }
    const isNetworkError = err.name === 'AbortError' || err.name === 'TypeError'
    if (!isNetworkError && !err.retryable) throw err
    return await fetchOnce(month, year)
  }
}

export async function getFdExtraIncome(
  month: number,
  year: number,
  options: { force?: boolean } = {}
): Promise<ExtraWorkIncome> {
  const key = cacheKey(month, year)
  const now = Date.now()

  const entry = cache.get(key)
  if (!options.force && entry && now - entry.cachedAt < FRESH_TTL_MS) {
    return entry.data
  }

  try {
    const fresh = await fetchWithRetry(month, year)
    cache.set(key, { data: fresh, cachedAt: now })
    return fresh
  } catch (e) {
    const errMsg = (e as Error).message || 'leave_unreachable'
    console.warn(`[extra-work-source] fetch failed for ${month}/${year}:`, errMsg)

    if (entry && now - entry.cachedAt < STALE_TTL_MS) {
      return {
        ...entry.data,
        source: 'stale',
        error: errMsg,
        fetchedAt: new Date().toISOString(),
      }
    }

    return emptyResult(month, year, 'fallback', errMsg)
  }
}

/**
 * ใช้ใน /api/summary และ /api/summary/history เพื่อตัดสินใจว่าเดือนนี้ใช้ leave หรือ ExpenseHistory เดิม
 * - 'leave': ใช้ค่าจาก leave (ผ่าน getFdExtraIncome)
 * - 'legacy': ใช้ค่าจาก ExpenseHistory เดิม (ก่อน cutover หรือ EXTRA_WORK_SOURCE=legacy)
 */
export function shouldUseLeaveSource(month: number, year: number): boolean {
  if (process.env.EXTRA_WORK_SOURCE === 'legacy') return false

  const cutover = process.env.EXTRA_WORK_CUTOVER_YYYYMM
  if (cutover && /^\d{6}$/.test(cutover)) {
    const cutoverNum = parseInt(cutover, 10)
    const currentNum = year * 100 + month
    return currentNum >= cutoverNum
  }

  return true
}

/**
 * Map building code ของ Funn D → ยอดเต็ม (rawTotal) จาก leave
 * ใช้สำหรับรายจ่าย "งานเสริม FD" (ไม่หาร 3)
 *   FUNNLP  = ลาดพร้าว 21 → raw.ladprao
 *   FUNNS81 = สุขุมวิท 81 → raw.sukhumvit
 */
export function getFdExtraExpenseForBuilding(
  buildingCode: string,
  raw: { ladprao: number; sukhumvit: number }
): number {
  if (buildingCode === 'FUNNLP') return Math.max(0, raw.ladprao)
  if (buildingCode === 'FUNNS81') return Math.max(0, raw.sukhumvit)
  return 0
}
