import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, role } = body

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: 'กรุณากรอก username และ password' },
        { status: 400 }
      )
    }

    // ค้นหา user ตาม username และ role (ไม่รวม password)
    // VIEWER สามารถ login จากหน้า STAFF ได้
    const allowedRoles = role === 'STAFF' ? ['STAFF', 'VIEWER'] : [role]
    const user = await prisma.user.findFirst({
      where: {
        username: username,
        role: { in: allowedRoles },
        isActive: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Username หรือ Password ไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    // เปรียบเทียบ password ด้วย bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Username หรือ Password ไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    // สร้างข้อมูล user สำหรับเก็บใน cookie
    const userData = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    }

    // Set cookie สำหรับ authentication
    const cookieStore = await cookies()
    cookieStore.set('access_user', encodeURIComponent(JSON.stringify(userData)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 วัน
      path: '/',
    })

    // สำเร็จ - ส่งข้อมูล user กลับไป (ไม่ส่ง password)
    return NextResponse.json(userData)
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}
