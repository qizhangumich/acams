/**
 * POST /api/answer
 *
 * HARD, UNAVOIDABLE answer submission pipeline
 * 
 * Request body:
 * {
 *   questionId: number,
 *   selectedAnswers: string[]
 * }
 * 
 * Rules:
 * - userId MUST come from session
 * - Reject request if session.userId is missing
 * - questionId MUST match Question.id in database
 * - NEVER rely on frontend index alone
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { submitQuestionAnswer } from '@/lib/progress/service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 1. Get session
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    // 2. Extract userId from session
    const user = await getUserFromSession(sessionToken)

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    const userId = user.id

    // 3. Validate request body
    const body = await request.json()
    const { questionId, selectedAnswers } = body

    if (!questionId || typeof questionId !== 'number') {
      return NextResponse.json(
        { success: false, message: 'questionId is required and must be a number' },
        { status: 400 }
      )
    }

    if (!Array.isArray(selectedAnswers) || selectedAnswers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'selectedAnswers is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    const result = await submitQuestionAnswer({
      userId,
      questionId,
      selectedAnswers,
    })

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      )
    }

    // 8. Log the write
    console.log('ANSWER SAVED', userId, questionId, result.progress.status)

    // Return success response
    return NextResponse.json({
      success: true,
      status: result.progress.status,
      selectedAnswers: result.progress.selected_answer,
      currentIndex: result.currentIndex,
      progress: result.progress,
    })
  } catch (error) {
    console.error('[answer] Error:', error)
    if (error instanceof Error && error.message === 'Question index does not match question ID') {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to save answer' },
      { status: 500 }
    )
  }
}

