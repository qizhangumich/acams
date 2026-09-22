/**
 * GET /api/review/queue
 *
 * Spaced-repetition review queue: every question the user has ever missed
 * gets a ReviewCard; this endpoint returns the cards that are due now,
 * soonest-due first.
 *
 * Also bootstraps cards for wrong-book entries that predate the SRS
 * feature, so long-time users' mistakes enter the schedule automatically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/route-auth'
import { ensureCardsForWrongBook } from '@/lib/review/srs'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const QUEUE_LIMIT = 50

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireUser(request)
    if (error) return error

    // Wrong-book mode: every not-yet-retested wrong-book question, in
    // question order — a sequential redo pass, independent of SRS due dates.
    if (request.nextUrl.searchParams.get('mode') === 'wrongbook') {
      const pending = await prisma.wrongBook.findMany({
        where: { user_id: user.id, retested_at: null },
        include: {
          question: { select: { id: true, index: true, domain: true, question_text: true } },
        },
        orderBy: { question: { index: 'asc' } },
      })
      const retestedCount = await prisma.wrongBook.count({
        where: { user_id: user.id, retested_at: { not: null } },
      })
      return NextResponse.json({
        success: true,
        queue: pending.map((w) => ({
          question_id: w.question_id,
          domain: w.question.domain,
          question_text: w.question.question_text,
          due_at: w.last_wrong_at.toISOString(),
          reps: 0,
          lapses: w.wrong_count,
          wrong_count: w.wrong_count,
        })),
        total: pending.length,
        stats: {
          due_count: pending.length,
          total_cards: pending.length + retestedCount,
          next_due_at: null,
        },
      })
    }

    await ensureCardsForWrongBook(prisma, user.id)

    const now = new Date()
    const [dueCards, totalCards, nextDue, wrongCounts] = await Promise.all([
      prisma.reviewCard.findMany({
        where: { user_id: user.id, due_at: { lte: now } },
        orderBy: { due_at: 'asc' },
        take: QUEUE_LIMIT,
        include: {
          question: { select: { id: true, domain: true, question_text: true } },
        },
      }),
      prisma.reviewCard.count({ where: { user_id: user.id } }),
      prisma.reviewCard.findFirst({
        where: { user_id: user.id, due_at: { gt: now } },
        orderBy: { due_at: 'asc' },
        select: { due_at: true },
      }),
      prisma.wrongBook.findMany({
        where: { user_id: user.id },
        select: { question_id: true, wrong_count: true },
      }),
    ])

    const wrongCountMap = new Map(wrongCounts.map((w) => [w.question_id, w.wrong_count]))

    return NextResponse.json({
      success: true,
      queue: dueCards.map((card) => ({
        question_id: card.question_id,
        domain: card.question.domain,
        question_text: card.question.question_text,
        due_at: card.due_at.toISOString(),
        reps: card.reps,
        lapses: card.lapses,
        wrong_count: wrongCountMap.get(card.question_id) ?? card.lapses,
      })),
      total: dueCards.length,
      stats: {
        due_count: dueCards.length,
        total_cards: totalCards,
        next_due_at: nextDue?.due_at.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error('Error generating review queue:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to generate review queue' },
      { status: 500 }
    )
  }
}
