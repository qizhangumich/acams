/**
 * GET /api/progress/resume
 * 
 * Get next question to resume from
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { getResumeQuestionState } from '@/lib/progress/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get('session_token')?.value

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

    const state = await getResumeQuestionState(user.id)
    if (state) {
      return NextResponse.json({
        success: true,
        currentIndex: state.currentIndex,
        question: state.question,
        progress: state.progress,
        totalQuestions: state.totalQuestions,
      })
    }

    // No progress found, return success: false
    return NextResponse.json({
      success: false,
      message: 'No saved progress',
    })
  } catch (error) {
    console.error('[resume] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to resume progress' },
      { status: 500 }
    )
  }
}

