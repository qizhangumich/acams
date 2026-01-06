/**
 * GET /api/questions/[questionId]
 * 
 * Get a specific question by ID (READ-ONLY)
 * 
 * Used for navigating from Wrong Book to Question Page
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
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

    const questionId = parseInt(params.questionId)

    if (isNaN(questionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid question ID' },
        { status: 400 }
      )
    }

    // Get question (READ-ONLY)
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
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
      question,
    })
  } catch (error) {
    console.error('Error getting question:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get question' },
      { status: 500 }
    )
  }
}

