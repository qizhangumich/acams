/**
 * Magic Link Authentication
 * 
 * Handles token generation, validation, and email sending
 */

import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendMagicLinkEmail } from './email'

const TOKEN_EXPIRY_MINUTES = 15
const MAX_TOKENS_PER_EMAIL_PER_HOUR = 5

/**
 * Generate a secure random token for magic link
 */
export function generateMagicLinkToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Create and send magic link
 * 
 * @param email User email address
 * @returns Success status and message
 */
export async function createMagicLink(email: string): Promise<{ success: boolean; message: string }> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, message: 'Invalid email format' }
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Rate limiting: Check tokens created in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentTokens = await prisma.magicLinkToken.count({
    where: {
      email: normalizedEmail,
      created_at: {
        gte: oneHourAgo,
      },
    },
  })

  if (recentTokens >= MAX_TOKENS_PER_EMAIL_PER_HOUR) {
    return {
      success: false,
      message: 'Too many magic link requests. Please try again later.',
    }
  }

  // Generate token
  const token = generateMagicLinkToken()
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

  // Store token in database
  await prisma.magicLinkToken.create({
    data: {
      email: normalizedEmail,
      token,
      expires_at: expiresAt,
    },
  })

  // Send email (don't await - fire and forget)
  sendMagicLinkEmail(normalizedEmail, token).catch((error) => {
    console.error('Failed to send magic link email:', error)
    // Don't throw - token is already created
  })

  // Always return success (security: don't reveal if email exists)
  return {
    success: true,
    message: 'If an account exists, a magic link has been sent to your email.',
  }
}

/**
 * Verify magic link token
 * 
 * @param token Magic link token
 * @param email User email
 * @returns User ID if valid, null if invalid
 */
export async function verifyMagicLinkToken(
  token: string,
  email: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase()

    // Find token
    const magicLinkToken = await prisma.magicLinkToken.findUnique({
      where: { token },
    })

    // Check if token exists
    if (!magicLinkToken) {
      return { success: false, error: 'Invalid magic link' }
    }

    // Check if email matches
    if (magicLinkToken.email !== normalizedEmail) {
      return { success: false, error: 'Invalid magic link' }
    }

    // Check if token is expired
    if (magicLinkToken.expires_at < new Date()) {
      // Mark as used (cleanup)
      try {
        await prisma.magicLinkToken.update({
          where: { id: magicLinkToken.id },
          data: { used: true },
        })
      } catch (updateError) {
        // Ignore update errors during cleanup
        console.error('Error marking expired token as used:', updateError)
      }
      return { success: false, error: 'Magic link expired' }
    }

    // Check if token already used
    if (magicLinkToken.used) {
      return { success: false, error: 'Magic link already used' }
    }

    // Mark token as used
    await prisma.magicLinkToken.update({
      where: { id: magicLinkToken.id },
      data: { used: true },
    })

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          last_active_at: new Date(),
        },
      })
    } else {
      // Update last active
      await prisma.user.update({
        where: { id: user.id },
        data: { last_active_at: new Date() },
      })
    }

    return { success: true, userId: user.id }
  } catch (error) {
    // Log database or other errors
    console.error('Error in verifyMagicLinkToken:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      token: token.substring(0, 10) + '...',
      email: email,
    })
    // Return error instead of throwing
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error during verification' 
    }
  }
}

/**
 * Clean up expired tokens (run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.magicLinkToken.deleteMany({
    where: {
      OR: [
        { expires_at: { lt: new Date() } },
        { used: true, created_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Delete used tokens older than 24 hours
      ],
    },
  })

  return result.count
}

