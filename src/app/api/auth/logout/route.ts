import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET - ลบ cookie และ redirect ไปหน้า login
export async function GET() {
  const cookieStore = await cookies()

  // ลบ cookie ทั้งหมดที่เกี่ยวกับ auth
  cookieStore.delete('access_user')
  cookieStore.delete('access_role')

  // Redirect ไปหน้า access
  return NextResponse.redirect(new URL('/access', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'))
}

// POST - ลบ cookie แล้วส่ง response
export async function POST() {
  const cookieStore = await cookies()

  // ลบ cookie ทั้งหมดที่เกี่ยวกับ auth
  cookieStore.delete('access_user')
  cookieStore.delete('access_role')

  return NextResponse.json({ success: true, message: 'Logged out successfully' })
}
