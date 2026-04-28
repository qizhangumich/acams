/**
 * GET /api/questions/first
 *
 * Returns the first question from the database (index = 0).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { getQuestionStateByIndex } from '@/lib/progress/service'
import { prisma } from '@/lib/prisma'

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

    const firstQuestion = await getQuestionStateByIndex(user.id, 0)

    if (!firstQuestion) {
      return NextResponse.json(
        { success: false, message: 'No questions found' },
        { status: 200 }
      )
    }

    // Get total count
    const totalQuestions = await prisma.question.count()

    return NextResponse.json({
      success: true,
      index: firstQuestion.currentIndex,
      totalQuestions,
      question: firstQuestion.question,
      progress: firstQuestion.progress,
    })
  } catch (error) {
    console.error('[questions/first] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load questions' },
      { status: 500 }
    )
  }
}


