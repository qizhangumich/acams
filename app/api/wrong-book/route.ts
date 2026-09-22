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
            index: true,
            domain: true,
            question_text: true,
            tags: {
              where: {
                user_id: user.id,
              },
              select: {
                tag: true,
              },
              orderBy: {
                tag: 'asc',
              },
            },
            notes: {
              where: {
                user_id: user.id,
              },
              select: {
                content: true,
                updated_at: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { question: { index: 'asc' } }, // sequential by question number
    })

    // Format response: pending (not yet retested) first, each group in question order
    const formattedQuestions = wrongQuestions
      .map((wrong) => ({
        question_id: wrong.question_id,
        question_index: wrong.question.index,
        wrong_count: wrong.wrong_count,
        last_wrong_at: wrong.last_wrong_at.toISOString(),
        retested_at: wrong.retested_at?.toISOString() ?? null,
        domain: wrong.question.domain,
        question_text: wrong.question.question_text,
        tags: wrong.question.tags.map((item) => item.tag),
        has_note: wrong.question.notes.length > 0 && wrong.question.notes[0].content.trim().length > 0,
        note_updated_at: wrong.question.notes[0]?.updated_at.toISOString() || null,
      }))
      .sort((a, b) =>
        (a.retested_at ? 1 : 0) - (b.retested_at ? 1 : 0) || a.question_index - b.question_index
      )

    const retested = formattedQuestions.filter((q) => q.retested_at).length

    return NextResponse.json({
      success: true,
      questions: formattedQuestions,
      total: formattedQuestions.length,
      stats: {
        total: formattedQuestions.length,
        retested,
        pending: formattedQuestions.length - retested,
      },
    })
  } catch (error) {
    console.error('Error getting wrong book:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get wrong book' },
      { status: 500 }
    )
  }
}

