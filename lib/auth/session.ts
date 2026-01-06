/**
 * Session Management
 * 
 * Handles JWT token generation and verification
 */

import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'
const JWT_EXPIRY = '30d' // 30 days

export interface SessionPayload {
  userId: string
  email: string
}

/**
 * Generate JWT session token
 */
export function generateSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  })
}

/**
 * Verify JWT session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload
    return decoded
  } catch (error) {
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

