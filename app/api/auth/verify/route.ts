/**
 * GET /api/auth/verify
 * 
 * Verify magic link token and create/login user
 * Sets session cookie and returns verification result
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLinkToken } from '@/lib/auth/magic-link'
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// CRITICAL: Always use production domain for redirects
// NEVER use request.url or request.headers.host (could be preview domain)
const PRODUCTION_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token) {
      const redirectUrl = new URL('/login?error=missing_token', PRODUCTION_URL)
      return NextResponse.redirect(redirectUrl, { status: 303 })
    }

    const normalizedToken = token.trim()
    const decodedEmail = email ? decodeURIComponent(email) : undefined
    const result = await verifyMagicLinkToken(normalizedToken, decodedEmail)

    if (!result.success || !result.userId) {
      const error = result.error || 'verification_failed'
      const redirectUrl = new URL(`/login?error=${encodeURIComponent(error)}`, PRODUCTION_URL)
      return NextResponse.redirect(redirectUrl, { status: 303 })
    }

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: {
        id: true,
        email: true,
        last_active_at: true,
        last_question_id: true,
        created_at: true,
      },
    })

    if (!user) {
      const redirectUrl = new URL('/login?error=user_not_found', PRODUCTION_URL)
      return NextResponse.redirect(redirectUrl, { status: 303 })
    }

    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
    })

    const redirectUrl = new URL('/dashboard', PRODUCTION_URL)
    const response = NextResponse.redirect(redirectUrl, { status: 303 })

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Error verifying magic link:', error)
    const redirectUrl = new URL('/login?error=verification_failed', PRODUCTION_URL)
    return NextResponse.redirect(redirectUrl, { status: 303 })
  }
}
