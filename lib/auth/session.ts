/**
 * Session Management
 * 
 * Handles JWT token generation and verification
 * Single source of truth for authentication logic
 */

import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export const SESSION_COOKIE_NAME = 'session_token'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'
const JWT_EXPIRY = '30d'

export interface SessionPayload {
  userId: string
  email: string
}

export function generateSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  })
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionPayload
    return decoded
  } catch (error) {
    return null
  }
}

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
