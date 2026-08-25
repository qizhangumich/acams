/**
 * GET /api/exam/[attemptId]
 *
 * Return the state of an exam attempt.
 * - in_progress: questions WITHOUT correct answers/explanations, saved
 *   answers, and the remaining time. An expired attempt is auto-submitted.
 * - submitted: the full scored report including correct answers and
 *   explanations for review.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/route-auth'
import { isExpired, remainingSeconds, scoreAttempt, submitAttempt } from '@/lib/exam/service'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { attemptId: string } }) {
  try {
    const { user, error } = await requireUser(request)
    if (error) return error

    let attempt = await prisma.examAttempt.findUnique({ where: { id: params.attemptId } })
    if (!attempt || attempt.user_id !== user.id) {
      return NextResponse.json({ success: false, message: 'Exam not found' }, { status: 404 })
    }

    if (attempt.status === 'in_progress' && isExpired(attempt)) {
      attempt = await submitAttempt(attempt, user.id)
    }

    const questions = await prisma.question.findMany({
      where: { id: { in: attempt.question_ids } },
      select: {
        id: true,
        domain: true,
        question_text: true,
        options: true,
        correct_answers: attempt.status === 'submitted',
        explanation: attempt.status === 'submitted',
        explanation_ai_en: attempt.status === 'submitted',
        explanation_ai_ch: attempt.status === 'submitted',
      },
    })
    const byId = new Map(questions.map((q) => [q.id, q]))
    const ordered = attempt.question_ids.map((id) => byId.get(id)).filter(Boolean)

    const base = {
      id: attempt.id,
      status: attempt.status,
      started_at: attempt.started_at.toISOString(),
      duration_min: attempt.duration_min,
      total_questions: attempt.question_ids.length,
      questions: ordered,
      answers: attempt.answers ?? {},
    }

    if (attempt.status === 'in_progress') {
      return NextResponse.json({
        success: true,
        attempt: { ...base, remaining_seconds: remainingSeconds(attempt) },
      })
    }

    const report = await scoreAttempt(attempt)
    return NextResponse.json({
      success: true,
      attempt: {
        ...base,
        submitted_at: attempt.submitted_at?.toISOString() ?? null,
        report,
      },
    })
  } catch (error) {
    console.error('[exam/attempt] Error:', error)
    return NextResponse.json({ success: false, message: 'Failed to load exam' }, { status: 500 })
  }
}
