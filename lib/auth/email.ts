/**
 * Email Service
 * 
 * Sends magic link emails using Resend (or similar service)
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

  try {
    await resend.emails.send({
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
    })
  } catch (error) {
    console.error('Failed to send magic link email:', error)
    throw error
  }
}

