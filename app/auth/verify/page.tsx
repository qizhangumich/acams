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
  // Next.js automatically decodes URL parameters, but ensure it's decoded
  const token = searchParams.token
  const email = searchParams.email ? decodeURIComponent(searchParams.email) : undefined

  // Missing parameters - redirect to login
  if (!token || !email) {
    redirect('/login?error=missing_parameters')
  }

  try {
    // Verify magic link token
    const result = await verifyMagicLinkToken(token, email)

    if (!result.success || !result.userId) {
      // Log the specific error for debugging
      console.error('Magic link verification failed:', {
        error: result.error,
        token: token.substring(0, 10) + '...',
        email: email,
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
      email: email,
    })
    redirect('/login?error=verification_failed')
  }
}

