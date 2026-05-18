import { NextRequest, NextResponse } from 'next/server'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'
import { leaveBayFetch, LeaveBayError } from '@/lib/leave-bay-client'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    await requireMenuAccess('/holidays')
    const { employeeId } = await params
    if (!employeeId) {
      return NextResponse.json({ error: 'ต้องระบุ employeeId' }, { status: 400 })
    }
    const data = await leaveBayFetch('/api/public/compensatory/pending', {
      query: { employeeId },
    })
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
    console.error('pending records error:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 })
  }
}
