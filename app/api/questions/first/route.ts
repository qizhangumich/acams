/**
 * GET /api/questions/first
 *
 * Returns the first question from the database (index = 0).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get first question (index = 0)
    const firstQuestion = await prisma.question.findUnique({
      where: { index: 0 },
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
      index: firstQuestion.index,
      totalQuestions,
      question: firstQuestion,
    })
  } catch (error) {
    console.error('[questions/first] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load questions' },
      { status: 500 }
    )
  }
}


