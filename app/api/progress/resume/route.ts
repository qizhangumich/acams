/**
 * GET /api/progress/resume
 * 
 * Get next question to resume from
 * 
 * Returns the next question the user should work on based on their progress.
 * If no questions exist in the database, returns 404.
 * If user has no progress, returns the first question.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { resumeFromLastQuestion } from '@/lib/progress/restore'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      console.error('[resume] No session token')
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await getUserFromSession(sessionToken)

    if (!user) {
      console.error('[resume] Invalid session token')
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    console.log(`[resume] User ${user.id} requesting resume`)

    // Get resume question
    const result = await resumeFromLastQuestion(user.id)

    if (!result) {
      console.error(`[resume] No questions found for user ${user.id}`)
      return NextResponse.json(
        { success: false, message: 'No questions found in database' },
        { status: 404 }
      )
    }

    console.log(`[resume] Returning question ${result.questionId} for user ${user.id}`)

    return NextResponse.json({
      success: true,
      question_id: result.questionId,
      question: result.question,
      progress: result.progress,
    })
  } catch (error) {
    console.error('[resume] Error resuming progress:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message: `Failed to resume progress: ${errorMessage}` },
      { status: 500 }
    )
  }
}

