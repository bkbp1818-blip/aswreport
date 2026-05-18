import { NextResponse } from 'next/server'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'
import { leaveBayFetch, LeaveBayError } from '@/lib/leave-bay-client'

export async function GET() {
  try {
    await requireMenuAccess('/holidays')
    const data = await leaveBayFetch('/api/public/employees-with-pending')
    return NextResponse.json(data)
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    if (error instanceof LeaveBayError) {
      return NextResponse.json(
        { error: error.message, ...(error.code ? { code: error.code } : {}) },
        { status: error.status }
      )
    }
    console.error('employees-with-pending error:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 })
  }
}
