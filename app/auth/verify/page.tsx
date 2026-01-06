export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /auth/verify
 * 
 * Magic link verification page
 * Redirects browser directly to API endpoint
 * Browser must hit API directly to receive Set-Cookie header
 */

import { redirect } from 'next/navigation'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { token?: string; email?: string }
}) {
  // Get token from URL
  const token = searchParams.token
  const email = searchParams.email // Optional

  // Missing token - redirect to login
  if (!token) {
    redirect('/login?error=missing_token')
  }

  // Normalize token
  const normalizedToken = token.trim()

  // Build API URL with token
  // Browser will directly hit this API endpoint
  // API will set cookie and redirect to /questions
  const apiUrl = `/api/auth/verify?token=${encodeURIComponent(normalizedToken)}${email ? `&email=${encodeURIComponent(email)}` : ''}`

  // Redirect browser to API endpoint
  // This ensures browser receives Set-Cookie header directly
  redirect(apiUrl)
}

