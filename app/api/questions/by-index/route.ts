/**
 * GET /api/questions/by-index
 *
 * Returns a question from the database by its array index.
 *
 * Query params:
 * - index: number (0-based index in the questions array)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const indexParam = searchParams.get('index')

    if (indexParam === null) {
      return NextResponse.json(
        { success: false, message: 'index is required' },
        { status: 400 }
      )
    }

    const index = Number(indexParam)
    if (!Number.isFinite(index) || index < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid index' },
        { status: 400 }
      )
    }

    // Get total count to check if index is valid
    const totalQuestions = await prisma.question.count()

    if (index >= totalQuestions) {
      return NextResponse.json(
        { success: false, message: 'Index out of range' },
        { status: 400 }
      )
    }

    // Get question by index
    const question = await prisma.question.findUnique({
      where: { index },
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

    if (!question) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      index: question.index,
      totalQuestions,
      question,
    })
  } catch (error) {
    console.error('[questions/by-index] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load question' },
      { status: 500 }
    )
  }
}

