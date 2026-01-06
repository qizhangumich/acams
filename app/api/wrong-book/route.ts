/**
 * GET /api/wrong-book
 * 
 * Get wrong book questions (READ-ONLY)
 * 
 * Returns:
 * - List of wrong questions
 * - wrong_count and domain for each question
 * - Sorted by wrong_count (desc) and last_wrong_at (desc)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
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

    // Get wrong questions (READ-ONLY)
    const wrongQuestions = await prisma.wrongBook.findMany({
      where: { user_id: user.id },
      include: {
        question: {
          select: {
            id: true,
            domain: true,
            question_text: true,
          },
        },
      },
      orderBy: [
        { wrong_count: 'desc' }, // Most wrong first
        { last_wrong_at: 'desc' }, // Most recent first
      ],
    })

    // Format response
    const formattedQuestions = wrongQuestions.map((wrong) => ({
      question_id: wrong.question_id,
      wrong_count: wrong.wrong_count,
      last_wrong_at: wrong.last_wrong_at.toISOString(),
      domain: wrong.question.domain,
      question_text: wrong.question.question_text,
    }))

    return NextResponse.json({
      success: true,
      questions: formattedQuestions,
      total: formattedQuestions.length,
    })
  } catch (error) {
    console.error('Error getting wrong book:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get wrong book' },
      { status: 500 }
    )
  }
}

