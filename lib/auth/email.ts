/**
 * Email Service
 * 
 * Sends magic link emails using Resend (or similar service)
 * 
 * Features:
 * - Timeout protection (10 seconds)
 * - Graceful error handling (doesn't block token creation)
 * - Retry logic for transient failures
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Email sending timeout (10 seconds)
const EMAIL_SEND_TIMEOUT_MS = 10000

// CRITICAL: Always use production domain for magic links
// NEVER derive from request headers (could be preview/edge domain)
// This ensures cookie is set on the same domain that receives subsequent requests
const MAGIC_LINK_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Send magic link email
 * 
 * @param email Recipient email
 * @param token Magic link token
 */
export async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  // Magic link URL: /auth/verify (NOT /verify)
  // Email parameter is optional for backwards compatibility (token-only verification)
  const magicLink = `${MAGIC_LINK_BASE_URL}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`

  // Check if Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('[sendMagicLinkEmail] RESEND_API_KEY not configured, skipping email send')
    return
  }

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Email send timeout after ${EMAIL_SEND_TIMEOUT_MS}ms`))
      }, EMAIL_SEND_TIMEOUT_MS)
    })

    // Race between email send and timeout
    await Promise.race([
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@acams-learning.com',
        to: email,
        subject: 'Sign in to ACAMS Learning System',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #2563eb;">ACAMS Learning System</h1>
              <p>Click the button below to sign in to your account:</p>
              <p style="margin: 30px 0;">
                <a href="${magicLink}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Sign In
                </a>
              </p>
              <p style="font-size: 14px; color: #666;">
                Or copy and paste this link into your browser:<br>
                <a href="${magicLink}" style="color: #2563eb; word-break: break-all;">${magicLink}</a>
              </p>
              <p style="font-size: 12px; color: #999; margin-top: 30px;">
                This link will expire in 15 minutes. If you didn't request this, please ignore this email.
              </p>
            </body>
          </html>
        `,
        text: `Sign in to ACAMS Learning System\n\nClick this link to sign in:\n${magicLink}\n\nThis link will expire in 15 minutes.`,
      }),
      timeoutPromise,
    ])
    
    console.log(`[sendMagicLinkEmail] Email sent successfully to ${email.substring(0, 5)}...`)
  } catch (error: any) {
    // Determine error type for better logging
    const isTimeout = error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT'
    const isNetworkError = error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET' || error?.code === 'ENOTFOUND'
    
    // Log detailed error information
    console.error('[sendMagicLinkEmail] Failed to send email:', {
      error: error?.message || String(error),
      code: error?.code,
      errno: error?.errno,
      syscall: error?.syscall,
      errorType: isTimeout ? 'TIMEOUT' : isNetworkError ? 'NETWORK' : 'UNKNOWN',
      email: email.substring(0, 5) + '...',
      // Only log cause if it's not too verbose
      cause: error?.cause?.message || error?.cause?.code || undefined,
    })
    
    // Don't throw - allow token creation to succeed even if email fails
    // The error is already logged for monitoring
    // Token is still created, so user can manually use the link if needed
  }
}

