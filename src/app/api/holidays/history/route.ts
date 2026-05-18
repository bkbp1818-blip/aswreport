import { NextRequest, NextResponse } from 'next/server'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'
import { leaveBayFetch, LeaveBayError } from '@/lib/leave-bay-client'

export async function GET(request: NextRequest) {
  try {
    await requireMenuAccess('/holidays')

    const { searchParams } = new URL(request.url)
    const query: Record<string, string | undefined> = {}
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeId = searchParams.get('employeeId')
    if (startDate) query.startDate = startDate
    if (endDate) query.endDate = endDate
    if (employeeId) query.employeeId = employeeId

    const data = await leaveBayFetch('/api/public/compensatory/history', { query })
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
    console.error('history error:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 })
  }
}
