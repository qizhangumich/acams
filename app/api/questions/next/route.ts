/**
 * GET /api/questions/next
 *
 * Returns the next question from the database based on currentIndex.
 *
 * Query params:
 * - currentIndex: number (0-based index in the questions array)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currentIndexParam = searchParams.get('currentIndex')

    if (currentIndexParam === null) {
      return NextResponse.json(
        { success: false, message: 'currentIndex is required' },
        { status: 400 }
      )
    }

    const currentIndex = Number(currentIndexParam)
    if (!Number.isFinite(currentIndex) || currentIndex < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid currentIndex' },
        { status: 400 }
      )
    }

    const nextIndex = currentIndex + 1

    // Get total count to check if next index exists
    const totalQuestions = await prisma.question.count()

    if (nextIndex >= totalQuestions) {
      return NextResponse.json(
        { success: false, message: 'No more questions' },
        { status: 200 }
      )
    }

    // Get next question by index
    const nextQuestion = await prisma.question.findUnique({
      where: { index: nextIndex },
      select: {
        id: true,
        index: true,
        domain: true,
        question_text: true,
        options: true,
        correct_answers: true,
        explanation: true,
        explanation_ai_en: true,
        explanation_ai_ch: true,
      },
    })

    if (!nextQuestion) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      index: nextQuestion.index,
      totalQuestions,
      question: nextQuestion,
    })
  } catch (error) {
    console.error('[questions/next] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load next question' },
      { status: 500 }
    )
  }
}


