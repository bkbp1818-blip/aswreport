/**
 * Server-side wrapper สำหรับเรียก public API ของระบบ leave-bay
 * อ่าน LEAVE_API_BASE_URL + LEAVE_SHARED_API_KEY จาก env
 * timeout 10 วินาที และแปลง error ให้เป็นรูปแบบเดียวกันสำหรับ proxy route
 */

const FETCH_TIMEOUT_MS = 10_000

export class LeaveBayError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface LeaveBayFetchInit {
  method?: 'GET' | 'POST'
  query?: Record<string, string | undefined>
  body?: unknown
}

export async function leaveBayFetch<T = unknown>(
  path: string,
  init: LeaveBayFetchInit = {}
): Promise<T> {
  const baseUrl = process.env.LEAVE_API_BASE_URL
  const apiKey = process.env.LEAVE_SHARED_API_KEY
  if (!baseUrl || !apiKey) {
    throw new LeaveBayError(
      500,
      'ระบบยังไม่ได้ตั้งค่า LEAVE_API_BASE_URL / LEAVE_SHARED_API_KEY'
    )
  }

  let url = `${baseUrl.replace(/\/$/, '')}${path}`
  if (init.query) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== '') params.set(k, v)
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    })

    if (res.status === 401) {
      throw new LeaveBayError(500, 'API key ไม่ถูกต้อง — กรุณาตรวจสอบการตั้งค่า')
    }
    if (res.status >= 500) {
      throw new LeaveBayError(503, 'ระบบ leave-bay มีปัญหา กรุณาลองใหม่อีกครั้ง')
    }

    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      // leave-bay ตอบไม่ใช่ JSON — ปล่อย body เป็น null
    }

    if (!res.ok) {
      const errBody = body as { error?: string; code?: string } | null
      throw new LeaveBayError(
        res.status,
        errBody?.error ?? `leave-bay ตอบรหัส ${res.status}`,
        errBody?.code
      )
    }

    return body as T
  } catch (e) {
    if (e instanceof LeaveBayError) throw e
    const err = e as Error
    if (err.name === 'AbortError') {
      throw new LeaveBayError(503, 'เชื่อมต่อ leave-bay ไม่ได้ (timeout 10 วินาที)')
    }
    throw new LeaveBayError(503, 'เชื่อมต่อ leave-bay ไม่ได้')
  } finally {
    clearTimeout(timeoutId)
  }
}
