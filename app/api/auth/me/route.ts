/**
 * GET /api/auth/me
 * 
 * Get current user from session
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await getUserFromSession(sessionToken)

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        last_active_at: user.last_active_at,
        last_question_id: user.last_question_id,
        created_at: user.created_at,
      },
    })
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get user' },
      { status: 500 }
    )
  }
}

