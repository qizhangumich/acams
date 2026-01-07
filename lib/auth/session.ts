/**
 * Session Management (Edge + Node compatible)
 *
 * Uses `jose` so that JWT verification works in both Node (API routes)
 * and Edge Runtime (middleware).
 *
 * Single source of truth for:
 * - Cookie name
 * - Token creation
 * - Token verification
 */

import { SignJWT, jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

export const SESSION_COOKIE_NAME = 'session_token'

// CRITICAL: Use a single AUTH_SECRET across all environments
// Must be set in Vercel env: AUTH_SECRET=your-32+char-secret
const AUTH_SECRET = process.env.AUTH_SECRET

if (!AUTH_SECRET) {
  console.warn(
    '[auth/session] AUTH_SECRET is not set. Using an insecure default. ' +
      'Set AUTH_SECRET in your environment for production!'
  )
}

// Edge/Node compatible key
const key = new TextEncoder().encode(AUTH_SECRET || 'change-me-in-production')

// Default session lifetime (seconds)
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

export interface SessionPayload {
  userId: string
  email: string
}

/**
 * Create a signed JWT session token.
 * Works in both Node and Edge runtimes.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const token = await new SignJWT({ uid: payload.userId, email: payload.email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE)
    .sign(key)

  return token
}

/**
 * Verify a JWT session token.
 * Returns the payload if valid, or null if invalid/expired.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, key)

    const userId = typeof payload.uid === 'string' ? payload.uid : undefined
    const email = typeof payload.email === 'string' ? payload.email : undefined

    if (!userId || !email) {
      return null
    }

    return { userId, email }
  } catch {
    return null
  }
}

/**
 * Convenience helper to fetch the User record for a given token.
 */
export async function getUserFromSession(token: string | undefined | null) {
  const payload = await verifySessionToken(token)
  if (!payload) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      last_active_at: true,
      last_question_id: true,
      created_at: true,
    },
  })

  return user
}
