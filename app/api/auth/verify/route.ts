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
      return NextResponse.json(
        { success: false, error: 'missing_token', message: 'Token is required' },
        { status: 400 }
      )
    }

    // Normalize token
    const normalizedToken = token.trim()

    // Verify token (email is optional - token-only verification)
    const decodedEmail = email ? decodeURIComponent(email) : undefined
    const result = await verifyMagicLinkToken(normalizedToken, decodedEmail)

    if (!result.success || !result.userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'verification_failed',
          message: result.error || 'Invalid magic link' 
        },
        { status: 401 }
      )
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
      return NextResponse.json(
        { success: false, error: 'user_not_found', message: 'User not found' },
        { status: 404 }
      )
    }

    // Generate session token
    const sessionToken = generateSessionToken({
      userId: user.id,
      email: user.email,
    })

    // Create response with session token in cookie
    // API returns JSON only - page component handles redirects
    const response = NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    )

    // Set HTTP-only cookie (this is allowed in Route Handlers)
    // Cookie is set BEFORE redirect happens in page component
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error verifying magic link:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'verification_failed',
        message: 'Failed to verify magic link' 
      },
      { status: 500 }
    )
  }
}

