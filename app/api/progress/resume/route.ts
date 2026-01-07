/**
 * GET /api/progress/resume
 * 
 * Get next question to resume from
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { resumeFromLastQuestion } from '@/lib/progress/restore'

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

    const result = await resumeFromLastQuestion(user.id)

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'No questions found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      question_id: result.questionId,
      question: result.question,
      progress: result.progress,
    })
  } catch (error) {
    console.error('[resume] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to resume progress' },
      { status: 500 }
    )
  }
}

