/**
 * GET /api/auth/verify
 * 
 * Verify magic link token and create/login user
 * Sets session cookie and returns verification result
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLinkToken } from '@/lib/auth/magic-link'
import { generateSessionToken } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const email = searchParams.get('email') // Optional for backwards compatibility

    // Token is required (email is optional - derived from token)
    if (!token) {
      const redirectUrl = new URL('/login?error=missing_token', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Normalize token
    const normalizedToken = token.trim()

    // Verify token (email is optional - token-only verification)
    const decodedEmail = email ? decodeURIComponent(email) : undefined
    const result = await verifyMagicLinkToken(normalizedToken, decodedEmail)

    if (!result.success || !result.userId) {
      const error = result.error || 'verification_failed'
      const redirectUrl = new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Get user data
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
      const redirectUrl = new URL('/login?error=user_not_found', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Generate session token
    const sessionToken = generateSessionToken({
      userId: user.id,
      email: user.email,
    })

    // DEBUG: Log session creation
    console.log('[VERIFY API] Session created:', {
      userId: user.id,
      email: user.email,
      tokenLength: sessionToken.length,
      tokenPrefix: sessionToken.substring(0, 20) + '...',
    })

    // CRITICAL: Create redirect response FIRST, then set cookie on it
    // cookies().set() does NOT attach cookies to redirect responses
    // Must use response.cookies.set() on the redirect response object
    const redirectUrl = new URL('/questions', request.url)
    const response = NextResponse.redirect(redirectUrl)

    // Set HTTP-only cookie on the redirect response
    // CRITICAL: Cookie must be set with correct attributes for browser to accept it
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      // Do NOT set domain - let browser use current domain
      // Do NOT set expires - use maxAge instead
    })

    // DEBUG: Verify cookie is set on response
    const setCookieHeader = response.headers.get('Set-Cookie')
    console.log('[VERIFY API] Cookie set on response:', {
      hasSetCookie: !!setCookieHeader,
      cookieHeader: setCookieHeader ? setCookieHeader.substring(0, 50) + '...' : 'MISSING',
      redirectTo: redirectUrl.toString(),
    })

    return response
  } catch (error) {
    console.error('Error verifying magic link:', error)
    const redirectUrl = new URL('/login?error=verification_failed', request.url)
    return NextResponse.redirect(redirectUrl)
  }
}

