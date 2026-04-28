import { NextRequest, NextResponse } from 'next/server'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'
import { getFdExtraIncome, shouldUseLeaveSource } from '@/lib/extra-work-source'

export async function GET(request: NextRequest) {
  try {
    await requireMenuAccess('/')

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '', 10)
    const year = parseInt(searchParams.get('year') || '', 10)
    const force = searchParams.get('force') === '1'

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'month must be 1-12' },
        { status: 400 }
      )
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: 'year must be a 4-digit integer' },
        { status: 400 }
      )
    }

    if (!shouldUseLeaveSource(month, year)) {
      return NextResponse.json({
        month,
        year,
        fdExtraLadpraoIncome: 0,
        fdExtraSukhumvitIncome: 0,
        fdExtraExpenseLadprao: 0,
        fdExtraExpenseSukhumvit: 0,
        raw: { ladprao: 0, sukhumvit: 0 },
        source: 'legacy',
        fetchedAt: new Date().toISOString(),
      })
    }

    const data = await getFdExtraIncome(month, year, { force })
    return NextResponse.json({
      ...data,
      fdExtraExpenseLadprao: data.raw.ladprao,
      fdExtraExpenseSukhumvit: data.raw.sukhumvit,
    })
  } catch (error) {
    const authError = handleAuthError(error)
    if (authError) {
      return NextResponse.json({ error: authError.error }, { status: authError.status })
    }
    console.error('extra-work-sync error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    )
  }
}
