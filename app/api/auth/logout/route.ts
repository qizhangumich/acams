/**
 * POST /api/auth/logout
 * 
 * Invalidate session
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  })

  // Clear session cookie
  response.cookies.delete('session_token')

  return response
}

