/**
 * POST /api/review/answer
 *
 * Submit an answer during a review session. Updates progress, the wrong
 * book, and the spaced-repetition schedule — but, unlike practice submit,
 * does NOT move the user's practice resume position.
 *
 * Body: { questionId: number, selected: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/route-auth'
import { recordAnswerForSrs } from '@/lib/review/srs'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireUser(request)
    if (error) return error

    const body = await request.json()
    const questionId = Number(body?.questionId)
    const selectedRaw = body?.selected

    if (
      !Number.isInteger(questionId) ||
      !Array.isArray(selectedRaw) ||
      selectedRaw.length === 0 ||
      !selectedRaw.every((s: unknown) => typeof s === 'string')
    ) {
      return NextResponse.json(
        { success: false, message: 'questionId and selected[] are required' },
        { status: 400 }
      )
    }

    const selected = Array.from(new Set(selectedRaw.map((s: string) => s.trim()).filter(Boolean))).sort()

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, correct_answers: true },
    })
    if (!question) {
      return NextResponse.json({ success: false, message: 'Question not found' }, { status: 404 })
    }

    const correctSorted = [...question.correct_answers].sort()
    const isCorrect =
      selected.length === correctSorted.length && selected.every((s) => correctSorted.includes(s))

    await prisma.$transaction(async (tx) => {
      await tx.userProgress.upsert({
        where: { user_id_question_id: { user_id: user.id, question_id: question.id } },
        update: { status: isCorrect ? 'correct' : 'wrong', selected_answer: selected },
        create: {
          user_id: user.id,
          question_id: question.id,
          status: isCorrect ? 'correct' : 'wrong',
          selected_answer: selected,
        },
      })

      if (!isCorrect) {
        await tx.wrongBook.upsert({
          where: { user_id_question_id: { user_id: user.id, question_id: question.id } },
          update: { wrong_count: { increment: 1 }, last_wrong_at: new Date() },
          create: { user_id: user.id, question_id: question.id },
        })
      }

      await recordAnswerForSrs(tx, user.id, question.id, isCorrect)
    })

    const card = await prisma.reviewCard.findUnique({
      where: { user_id_question_id: { user_id: user.id, question_id: question.id } },
      select: { due_at: true, interval_days: true },
    })

    return NextResponse.json({
      success: true,
      correct: isCorrect,
      correct_answers: question.correct_answers,
      next_due_at: card?.due_at.toISOString() ?? null,
      interval_days: card?.interval_days ?? null,
    })
  } catch (error) {
    console.error('[review/answer] Error:', error)
    return NextResponse.json({ success: false, message: 'Failed to submit answer' }, { status: 500 })
  }
}
