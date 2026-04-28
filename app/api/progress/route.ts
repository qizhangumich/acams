/**
 * POST /api/progress
 * 
 * Save user's answer and update progress
 * Also updates WrongBook if answer is wrong
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { getQuestionStateById, submitQuestionAnswer } from '@/lib/progress/service'
import { z } from 'zod'

const requestSchema = z.object({
  question_id: z.number().int().positive(),
  selected_answer: z.array(z.string()).min(1),
  // Note: is_correct is optional - backend will verify independently
  is_correct: z.boolean().optional(),
})

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
    const { question_id, selected_answer } = requestSchema.parse(body)
    const result = await submitQuestionAnswer({
      userId,
      questionId: question_id,
      selectedAnswers: selected_answer,
    })

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      progress: result.progress,
      currentIndex: result.currentIndex,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Question index does not match question ID') {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    console.error('Error saving progress:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save progress' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/progress
 * 
 * Get user's overall progress or progress for a specific question
 * 
 * Query params:
 * - questionId (optional): Get progress for specific question
 */
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

    // Check if requesting specific question progress
    const { searchParams } = new URL(request.url)
    const questionIdParam = searchParams.get('questionId')

    if (questionIdParam) {
      // Get progress for specific question (READ-ONLY)
      const questionId = parseInt(questionIdParam)

      if (isNaN(questionId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid question ID' },
          { status: 400 }
        )
      }

      const questionState = await getQuestionStateById(user.id, questionId)

      return NextResponse.json({
        success: true,
        progress: questionState?.progress ?? null,
      })
    }

    // Get overall progress (existing logic)
    // Get total questions count
    const totalQuestions = await prisma.question.count()

    // Get user progress counts
    const progressCounts = await prisma.userProgress.groupBy({
      by: ['status'],
      where: { user_id: user.id },
      _count: true,
    })

    const counts = {
      not_started: 0,
      correct: 0,
      wrong: 0,
    }

    progressCounts.forEach((item) => {
      counts[item.status as keyof typeof counts] = item._count
    })

    const completed = counts.correct + counts.wrong
    const not_started = totalQuestions - completed

    return NextResponse.json({
      success: true,
      total_questions: totalQuestions,
      completed,
      correct: counts.correct,
      wrong: counts.wrong,
      not_started,
      last_question_id: user.last_question_id,
    })
  } catch (error) {
    console.error('Error getting progress:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get progress' },
      { status: 500 }
    )
  }
}
