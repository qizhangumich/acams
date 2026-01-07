/**
 * POST /api/progress/update
 *
 * Update user's current question index (for navigation without submission)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    // BREAKPOINT B FIX: Extract userId ONLY from session
    const user = await getUserFromSession(sessionToken)

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    // BREAKPOINT B FIX: Debug log
    const userId = user.id
    console.log('DB WRITE USER:', userId)

    const body = await request.json()
    const { currentIndex } = body

    if (typeof currentIndex !== 'number' || currentIndex < 0) {
      return NextResponse.json(
        { success: false, message: 'currentIndex is required and must be a non-negative number' },
        { status: 400 }
      )
    }

    // BREAKPOINT B FIX: Use userId from session (never from request body)
    // Update user's current_index
    await prisma.user.update({
      where: { id: userId },
      data: {
        current_index: currentIndex,
        last_active_at: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('[progress/update] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update progress' },
      { status: 500 }
    )
  }
}

