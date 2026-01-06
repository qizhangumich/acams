export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /auth/verify
 * 
 * Magic link verification page
 * Verifies token and redirects to questions page
 */

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyMagicLinkToken } from '@/lib/auth/magic-link'
import { generateSessionToken } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { token?: string; email?: string }
}) {
  // Token-only verification (email is derived from token in database)
  // Next.js automatically decodes URL params, but ensure token is properly extracted
  let token = searchParams.token

  // Missing token - redirect to login
  if (!token) {
    redirect('/login?error=missing_token')
  }

  // Normalize token: trim and decode if needed (Next.js should auto-decode, but be defensive)
  token = token.trim()

  try {
    // Verify magic link token (email is optional for backwards compatibility)
    const email = searchParams.email ? decodeURIComponent(searchParams.email) : undefined
    const result = await verifyMagicLinkToken(token, email)

    if (!result.success || !result.userId) {
      // Log the specific error for debugging
      console.error('Magic link verification failed:', {
        error: result.error,
        token: token.substring(0, 10) + '...',
      })
      // Verification failed - redirect to login with error
      redirect(`/login?error=${encodeURIComponent(result.error || 'verification_failed')}`)
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
      redirect('/login?error=user_not_found')
    }

    // Generate session token
    const sessionToken = generateSessionToken({
      userId: user.id,
      email: user.email,
    })

    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    // Verification successful - redirect to questions page
    redirect('/questions')
  } catch (error) {
    // Log detailed error information
    console.error('Error verifying magic link:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      token: token?.substring(0, 10) + '...',
    })
    redirect('/login?error=verification_failed')
  }
}

