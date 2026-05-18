import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireMenuAccess, handleAuthError } from '@/lib/auth'
import { leaveBayFetch, LeaveBayError } from '@/lib/leave-bay-client'

type PaymentMethod = 'promptpay' | 'cash' | 'transfer'
const VALID_METHODS: ReadonlyArray<PaymentMethod> = ['promptpay', 'cash', 'transfer']

const ELIGIBLE_BUILDING_CODES = ['CT', 'YW', 'NANA']
const HOLIDAY_FIELD_NAME = 'holidayCompensation'
const HOLIDAY_FIELD_LABEL = 'ค่าแรงวันหยุดชดเชย'

interface PayRequestBody {
  recordIds?: unknown
  paidByName?: unknown
  paymentMethod?: unknown
  paymentReference?: unknown
  employeeId?: unknown
}

interface LeaveBayPayResponse {
  success: boolean
  paidCount?: number
  totalAmount?: number
  paidRecordIds?: string[]
}

interface LeaveBayHistoryRecord {
  id: string
  employeeId: string
  employeeName: string
  holidayName: string
  workDate: string
  paidOtAmount: number
  paidSalarySnapshot: number
}

interface DescriptionItem {
  date: string
  name: string
  salary: number
  amount: number
}

interface InsertWarning {
  type: 'EXPENSE_HISTORY_INSERT_FAILED' | 'HISTORY_FETCH_FAILED' | 'HISTORY_RECORDS_NOT_FOUND' | 'BUILDINGS_NOT_FOUND'
  message: string
  details: {
    paidRecordIds: string[]
    employeeName?: string
    totalAllBuildings?: number
    perBuilding?: number
    month?: number
    year?: number
    groupId?: string
    items?: DescriptionItem[]
  }
}

function formatThaiDate(isoDate: string): string {
  const d = new Date(isoDate)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// ดึง details ของ records ที่เพิ่งจ่ายจาก leave-bay history endpoint
// filter startDate=today เพื่อลด payload (record เพิ่งสร้างใน paidAt วันนี้)
async function fetchPaidRecords(
  paidRecordIds: string[],
  employeeId: string | undefined,
  todayStr: string
): Promise<LeaveBayHistoryRecord[]> {
  const query: Record<string, string | undefined> = { startDate: todayStr }
  if (employeeId) query.employeeId = employeeId
  const data = await leaveBayFetch<{ records?: LeaveBayHistoryRecord[] }>(
    '/api/public/compensatory/history',
    { query }
  )
  const all = Array.isArray(data?.records) ? data.records : []
  const idSet = new Set(paidRecordIds)
  return all.filter((r) => idSet.has(r.id))
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

    // optional employeeId (frontend อาจส่งมาเพื่อ filter history endpoint ฝั่ง leave-bay ให้แคบ)
    const employeeIdHint =
      typeof body.employeeId === 'string' && body.employeeId.trim()
        ? body.employeeId.trim()
        : undefined

    // 1) จ่ายเงินที่ leave-bay
    const payResultRaw = await leaveBayFetch<LeaveBayPayResponse>(
      '/api/public/compensatory/pay',
      {
        method: 'POST',
        body: {
          recordIds,
          paidByName,
          paymentMethod: body.paymentMethod,
          ...(paymentReference ? { paymentReference } : {}),
        },
      }
    )

    const paidRecordIds: string[] = Array.isArray(payResultRaw?.paidRecordIds)
      ? payResultRaw.paidRecordIds.filter((id): id is string => typeof id === 'string')
      : []

    // ถ้า leave-bay ไม่ส่ง paidRecordIds กลับ หรือเป็น 0 → ตอบ success ปกติ ไม่ INSERT
    if (paidRecordIds.length === 0) {
      return NextResponse.json(payResultRaw)
    }

    // 2) Sync ExpenseHistory — best-effort (fail → warning, ไม่ rollback)
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    let warning: InsertWarning | null = null

    try {
      // 2.1) ดึง details ของ records ที่จ่าย
      const paidRecords = await fetchPaidRecords(paidRecordIds, employeeIdHint, todayStr)

      if (paidRecords.length === 0) {
        warning = {
          type: 'HISTORY_RECORDS_NOT_FOUND',
          message: 'จ่ายเงินสำเร็จ แต่ดึงรายละเอียดกลับมาบันทึก ExpenseHistory ไม่พบ — กรุณาเพิ่มมือ',
          details: { paidRecordIds },
        }
      } else {
        // 2.2) คำนวณ
        const employeeName = paidRecords[0].employeeName
        const employeeId = paidRecords[0].employeeId
        const days = paidRecords.length
        const totalAllBuildings = paidRecords.reduce(
          (s, r) => s + Number(r.paidOtAmount || 0),
          0
        )
        const perBuilding = totalAllBuildings / ELIGIBLE_BUILDING_CODES.length

        const items: DescriptionItem[] = paidRecords.map((r) => ({
          date: formatThaiDate(r.workDate),
          name: r.holidayName,
          salary: Number(r.paidSalarySnapshot || 0),
          amount: Number(r.paidOtAmount || 0),
        }))

        const groupId = randomUUID()
        const descriptionPayload = {
          v: 1,
          employeeName,
          employeeId,
          days,
          buildingCount: ELIGIBLE_BUILDING_CODES.length,
          totalAllBuildings: Number(totalAllBuildings.toFixed(2)),
          perBuilding: Number(perBuilding.toFixed(2)),
          items,
          syncedFromLeaveBay: true,
          paidAt: now.toISOString(),
        }
        const description = JSON.stringify(descriptionPayload)

        // 2.3) Query buildings + INSERT 3 records ใน transaction
        const buildings = await prisma.building.findMany({
          where: { code: { in: ELIGIBLE_BUILDING_CODES } },
        })

        if (buildings.length !== ELIGIBLE_BUILDING_CODES.length) {
          warning = {
            type: 'BUILDINGS_NOT_FOUND',
            message: `จ่ายเงินสำเร็จ แต่ไม่พบอาคาร ${ELIGIBLE_BUILDING_CODES.join('/')} ครบทั้ง 3 อาคาร — กรุณาเพิ่มมือ`,
            details: {
              paidRecordIds,
              employeeName,
              totalAllBuildings: Number(totalAllBuildings.toFixed(2)),
              perBuilding: Number(perBuilding.toFixed(2)),
              month,
              year,
              groupId,
              items,
            },
          }
        } else {
          try {
            await prisma.$transaction(
              buildings.map((b) =>
                prisma.expenseHistory.create({
                  data: {
                    targetType: 'SETTINGS',
                    targetId: b.id,
                    fieldName: HOLIDAY_FIELD_NAME,
                    fieldLabel: HOLIDAY_FIELD_LABEL,
                    actionType: 'ADD',
                    amount: perBuilding,
                    description,
                    month,
                    year,
                    groupId,
                  },
                })
              )
            )
          } catch (insertErr) {
            console.error('ExpenseHistory INSERT failed:', insertErr)
            warning = {
              type: 'EXPENSE_HISTORY_INSERT_FAILED',
              message:
                'จ่ายเงินสำเร็จ แต่บันทึกในรายงานค่าใช้จ่ายไม่สำเร็จ — กรุณาเพิ่มมือภายหลัง',
              details: {
                paidRecordIds,
                employeeName,
                totalAllBuildings: Number(totalAllBuildings.toFixed(2)),
                perBuilding: Number(perBuilding.toFixed(2)),
                month,
                year,
                groupId,
                items,
              },
            }
          }
        }
      }
    } catch (histErr) {
      console.error('History fetch failed after pay success:', histErr)
      warning = {
        type: 'HISTORY_FETCH_FAILED',
        message:
          'จ่ายเงินสำเร็จ แต่ดึงรายละเอียดจาก leave-bay ไม่ได้ — บันทึก ExpenseHistory ไม่สำเร็จ กรุณาเพิ่มมือ',
        details: { paidRecordIds },
      }
    }

    return NextResponse.json({
      ...payResultRaw,
      ...(warning ? { warning } : {}),
    })
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
