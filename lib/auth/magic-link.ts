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

  try {
    // Rate limiting: Check tokens created in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    let recentTokens = 0
    
    try {
      recentTokens = await prisma.magicLinkToken.count({
        where: {
          email: normalizedEmail,
          created_at: {
            gte: oneHourAgo,
          },
        },
      })
    } catch (dbError: any) {
      console.error('[createMagicLink] Database error during rate limit check:', dbError)
      // Check if it's a connection error - if so, fail early
      if (
        dbError.code === 'P1001' || 
        dbError.errorCode === 'P1001' ||
        dbError.message?.includes('Can\'t reach database server') ||
        dbError.name === 'PrismaClientInitializationError'
      ) {
        return {
          success: false,
          message: 'Database connection error. Please check if the database is running and try again later.',
        }
      }
      // If database is unavailable for other reasons, allow the request but log the error
      // This prevents complete failure when DB is temporarily unavailable
    }

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
    try {
      await prisma.magicLinkToken.create({
        data: {
          email: normalizedEmail,
          token,
          expires_at: expiresAt,
        },
      })
    } catch (dbError: any) {
      console.error('[createMagicLink] Database error creating token:', dbError)
      // Check if it's a connection error (including PrismaClientInitializationError)
      if (
        dbError.code === 'P1001' || 
        dbError.errorCode === 'P1001' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.message?.includes('Can\'t reach database server')
      ) {
        return {
          success: false,
          message: 'Database connection error. Please check if the database is running and try again later.',
        }
      }
      throw dbError
    }

    // Send email (don't await - fire and forget)
    sendMagicLinkEmail(normalizedEmail, token).catch((error) => {
      console.error('[createMagicLink] Failed to send magic link email:', error)
      // Don't throw - token is already created
      // Email sending failure doesn't prevent token creation
    })

    // Always return success (security: don't reveal if email exists)
    return {
      success: true,
      message: 'If an account exists, a magic link has been sent to your email.',
    }
  } catch (error) {
    console.error('[createMagicLink] Unexpected error:', error)
    return {
      success: false,
      message: 'Failed to create magic link. Please try again later.',
    }
  }
}

/**
 * Verify magic link token
 * 
 * @param token Magic link token (raw, not hashed)
 * @param email User email (optional, for backwards compatibility)
 * @returns User ID if valid, null if invalid
 */
export async function verifyMagicLinkToken(
  token: string,
  email?: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // ============================================
    // STEP 1: Normalize and validate token format
    // ============================================
    const normalizedToken = token.trim()
    
    console.log('[VERIFY] Raw token received:', normalizedToken.substring(0, 20) + '...')
    console.log('[VERIFY] Token length:', normalizedToken.length)
    
    // Validate token format (should be 64 hex characters from randomBytes(32).toString('hex'))
    if (!normalizedToken || normalizedToken.length !== 64) {
      console.error('[VERIFY] Invalid token format - wrong length:', {
        tokenLength: normalizedToken.length,
        expectedLength: 64,
        tokenPrefix: normalizedToken.substring(0, 10) + '...',
      })
      return { success: false, error: 'Invalid magic link' }
    }

    // Validate hex format
    if (!/^[0-9a-f]{64}$/i.test(normalizedToken)) {
      console.error('[VERIFY] Token contains invalid characters:', {
        tokenPrefix: normalizedToken.substring(0, 10) + '...',
      })
      return { success: false, error: 'Invalid magic link' }
    }

    // ============================================
    // STEP 2: Lookup token in database
    // ============================================
    // Token is stored as RAW (not hashed) - direct lookup
    // No hashing needed - token from URL matches token in DB exactly
    const magicLinkToken = await prisma.magicLinkToken.findUnique({
      where: { token: normalizedToken },
    })

    console.log('[VERIFY] Database lookup result:', {
      found: !!magicLinkToken,
      tokenId: magicLinkToken?.id || 'N/A',
      tokenEmail: magicLinkToken?.email || 'N/A',
      expiresAt: magicLinkToken?.expires_at?.toISOString() || 'N/A',
      used: magicLinkToken?.used ?? 'N/A',
    })

    // ============================================
    // STEP 3: Check if token exists
    // ============================================
    if (!magicLinkToken) {
      console.error('[VERIFY] Token not found in database:', {
        tokenPrefix: normalizedToken.substring(0, 10) + '...',
        tokenLength: normalizedToken.length,
      })
      return { success: false, error: 'Invalid magic link' }
    }

    // ============================================
    // STEP 4: Derive email from token record
    // ============================================
    const tokenEmail = magicLinkToken.email.trim().toLowerCase()
    console.log('[VERIFY] Email from token record:', tokenEmail)

    // ============================================
    // STEP 5: (Optional) Verify email matches if provided
    // ============================================
    if (email) {
      const normalizedEmail = email.trim().toLowerCase()
      console.log('[VERIFY] Email from URL parameter:', normalizedEmail)
      if (tokenEmail !== normalizedEmail) {
        console.error('[VERIFY] Email mismatch:', {
          tokenEmail,
          providedEmail: normalizedEmail,
        })
        return { success: false, error: 'Invalid magic link' }
      }
    }

    // ============================================
    // STEP 6: Check if token is expired
    // ============================================
    // Ensure both sides are Date objects for correct comparison
    const now = new Date()
    const expiresAt = new Date(magicLinkToken.expires_at)
    
    console.log('[VERIFY] Expiration check:', {
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString(),
      isExpired: expiresAt < now,
    })

    if (expiresAt < now) {
      console.error('[VERIFY] Token expired')
      // Mark as used (cleanup) - but don't fail the update if it errors
      try {
        await prisma.magicLinkToken.update({
          where: { id: magicLinkToken.id },
          data: { used: true },
        })
      } catch (updateError) {
        // Ignore update errors during cleanup
        console.error('[VERIFY] Error marking expired token as used:', updateError)
      }
      return { success: false, error: 'Magic link expired' }
    }

    // ============================================
    // STEP 7: Check if token already used
    // ============================================
    console.log('[VERIFY] Used flag check:', {
      used: magicLinkToken.used,
    })

    if (magicLinkToken.used) {
      console.error('[VERIFY] Token already used')
      return { success: false, error: 'Magic link already used' }
    }

    // ============================================
    // STEP 8: Mark token as used (BEFORE user operations)
    // ============================================
    // This prevents race conditions - mark as used immediately after validation
    await prisma.magicLinkToken.update({
      where: { id: magicLinkToken.id },
      data: { used: true },
    })
    console.log('[VERIFY] Token marked as used')

    // ============================================
    // STEP 9: Find or create user
    // ============================================
    let user = await prisma.user.findUnique({
      where: { email: tokenEmail },
    })

    if (!user) {
      console.log('[VERIFY] Creating new user:', tokenEmail)
      // Create new user
      user = await prisma.user.create({
        data: {
          email: tokenEmail,
          last_active_at: new Date(),
        },
      })
    } else {
      console.log('[VERIFY] Updating existing user:', user.id)
      // Update last active
      await prisma.user.update({
        where: { id: user.id },
        data: { last_active_at: new Date() },
      })
    }

    console.log('[VERIFY] Verification successful:', {
      userId: user.id,
      email: user.email,
    })

    return { success: true, userId: user.id }
  } catch (error) {
    // Log database or other errors
    console.error('[VERIFY] Error in verifyMagicLinkToken:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      token: token?.substring(0, 10) + '...',
      email: email || 'not provided',
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

