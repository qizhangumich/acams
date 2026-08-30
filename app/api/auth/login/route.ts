/**
 * POST /api/auth/login
 *
 * Single-admin username/password login. The username comes from
 * ADMIN_USERNAME (default "admin"). The password is checked against
 * ADMIN_PASSWORD if set, otherwise against the SHA-256 digest in
 * ADMIN_PASSWORD_SHA256 (which has a built-in default) — so no plaintext
 * secret lives in the repository. The session maps to one fixed account
 * (ADMIN_EMAIL) so all existing progress, wrong-book entries, and review
 * cards stay attached to it.
 *
 * Body: { username: string, password: string }
 */

import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD // optional plaintext override
const ADMIN_PASSWORD_SHA256 =
  process.env.ADMIN_PASSWORD_SHA256 ||
  'd7dcac7da9d219594ee452382671e2d40175e4165b1fb0ceabc42ef99f380c36'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'zhangqi362@gmail.com'

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Compare against self to keep timing uniform, then fail.
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

function passwordOk(password: string): boolean {
  if (ADMIN_PASSWORD) {
    return safeEqual(password, ADMIN_PASSWORD)
  }
  const digest = createHash('sha256').update(password).digest('hex')
  return safeEqual(digest, ADMIN_PASSWORD_SHA256.toLowerCase())
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      )
    }

    if (!safeEqual(username, ADMIN_USERNAME) || !passwordOk(password)) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const user = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { last_active_at: new Date() },
      create: { email: ADMIN_EMAIL, last_active_at: new Date() },
    })

    const sessionToken = await createSessionToken({ userId: user.id, email: user.email })

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
    })
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error) {
    console.error('[auth/login] Error:', error)
    return NextResponse.json({ success: false, message: 'Login failed' }, { status: 500 })
  }
}
