import { NextRequest, NextResponse } from 'next/server'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'
import { leaveBayFetch, LeaveBayError } from '@/lib/leave-bay-client'

type PaymentMethod = 'promptpay' | 'cash' | 'transfer'
const VALID_METHODS: ReadonlyArray<PaymentMethod> = ['promptpay', 'cash', 'transfer']

interface PayRequestBody {
  recordIds?: unknown
  paidByName?: unknown
  paymentMethod?: unknown
  paymentReference?: unknown
}

export async function POST(request: NextRequest) {
  try {
    await requireMenuAccess('/holidays')
    const body = (await request.json().catch(() => ({}))) as PayRequestBody

    const recordIds = Array.isArray(body.recordIds) ? body.recordIds : []
    if (
      recordIds.length === 0 ||
      !recordIds.every((x) => typeof x === 'string' && x.length > 0)
    ) {
      return NextResponse.json(
        { error: 'กรุณาเลือกรายการอย่างน้อย 1 รายการ' },
        { status: 400 }
      )
    }

    const paidByName = typeof body.paidByName === 'string' ? body.paidByName.trim() : ''
    if (!paidByName) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อผู้อนุมัติ' }, { status: 400 })
    }

    if (
      typeof body.paymentMethod !== 'string' ||
      !VALID_METHODS.includes(body.paymentMethod as PaymentMethod)
    ) {
      return NextResponse.json(
        { error: 'กรุณาเลือกวิธีจ่าย (promptpay/cash/transfer)' },
        { status: 400 }
      )
    }

    const paymentReference =
      typeof body.paymentReference === 'string' && body.paymentReference.trim()
        ? body.paymentReference.trim()
        : undefined

    const data = await leaveBayFetch('/api/public/compensatory/pay', {
      method: 'POST',
      body: {
        recordIds,
        paidByName,
        paymentMethod: body.paymentMethod,
        ...(paymentReference ? { paymentReference } : {}),
      },
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
    console.error('pay error:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึก' }, { status: 500 })
  }
}
