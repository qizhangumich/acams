/**
 * Session Management
 * 
 * Handles JWT token generation and verification
 * Single source of truth for authentication logic
 */

import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

// CRITICAL: Cookie name must be consistent across all files
export const SESSION_COOKIE_NAME = 'session_token'

// CRITICAL: JWT_SECRET must be set in production
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'
const JWT_EXPIRY = '30d' // 30 days

export interface SessionPayload {
  userId: string
  email: string
}

/**
 * Generate JWT session token
 * 
 * @param payload User ID and email
 * @returns JWT token string
 */
export function generateSessionToken(payload: SessionPayload): string {
  if (!JWT_SECRET || JWT_SECRET === 'change-me-in-production') {
    console.warn('[SESSION] WARNING: Using default JWT_SECRET - not secure for production!')
  }

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  })

  // DEBUG: Log token generation
  console.log('[SESSION] Token generated:', {
    userId: payload.userId,
    email: payload.email,
    tokenLength: token.length,
  })

  return token
}

/**
 * Verify JWT session token
 * 
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload

    // DEBUG: Log successful verification
    console.log('[SESSION] Token verified:', {
      userId: decoded.userId,
      email: decoded.email,
    })

    return decoded
  } catch (error) {
    // DEBUG: Log verification failure
    console.log('[SESSION] Token verification failed:', {
      error: error instanceof Error ? error.message : String(error),
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
    })
    return null
  }
}

/**
 * Get user from session token
 */
export async function getUserFromSession(token: string) {
  const payload = verifySessionToken(token)
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

