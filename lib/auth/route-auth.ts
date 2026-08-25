/**
 * Shared session check for API route handlers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export type AuthedUser = NonNullable<Awaited<ReturnType<typeof getUserFromSession>>>

export async function requireUser(
  request: NextRequest
): Promise<{ user: AuthedUser; error: null } | { user: null; error: NextResponse }> {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!sessionToken) {
    return {
      user: null,
      error: NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 }),
    }
  }

  const user = await getUserFromSession(sessionToken)
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 }),
    }
  }

  return { user, error: null }
}
