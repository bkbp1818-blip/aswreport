import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// GET - ดึงข้อมูล user ปัจจุบันจาก DB (ใช้ refresh allowedMenus)
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'ไม่ได้เข้าสู่ระบบ' }, { status: 401 })
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      allowedMenus: user.allowedMenus,
    })
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
