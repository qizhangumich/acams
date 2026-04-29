/**
 * POST /api/questions/submit
 *
 * Submit answer for a question from the database
 * Validates answer and persists user progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { submitQuestionAnswer } from '@/lib/progress/service'

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
    const { questionId, selectedOptions, currentIndex } = body

    if (!questionId || !Array.isArray(selectedOptions) || selectedOptions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'questionId and selectedOptions are required' },
        { status: 400 }
      )
    }

    if (
      currentIndex !== undefined &&
      (typeof currentIndex !== 'number' || currentIndex < 0)
    ) {
      return NextResponse.json(
        { success: false, message: 'currentIndex must be a non-negative number when provided' },
        { status: 400 }
      )
    }

    const result = await submitQuestionAnswer({
      userId,
      questionId,
      selectedAnswers: selectedOptions,
      currentIndex,
    })

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      )
    }

    // Return success response
    return NextResponse.json({
      success: true,
      currentIndex: result.currentIndex,
      progress: result.progress,
    })
  } catch (error) {
    console.error('[questions/submit] Error:', error)
    if (error instanceof Error && error.message === 'Question index does not match question ID') {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to submit answer' },
      { status: 500 }
    )
  }
}

