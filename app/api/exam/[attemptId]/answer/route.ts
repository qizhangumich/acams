/**
 * POST /api/exam/[attemptId]/answer
 *
 * Save the answer for one question of an in-progress attempt.
 * Body: { questionId: number, selected: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/route-auth'
import { ExamAnswers, isExpired, submitAttempt } from '@/lib/exam/service'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { attemptId: string } }) {
  try {
    const { user, error } = await requireUser(request)
    if (error) return error

    const body = await request.json()
    const questionId = Number(body?.questionId)
    const selected = body?.selected

    if (
      !Number.isInteger(questionId) ||
      !Array.isArray(selected) ||
      !selected.every((s: unknown) => typeof s === 'string')
    ) {
      return NextResponse.json(
        { success: false, message: 'questionId and selected[] are required' },
        { status: 400 }
      )
    }

    const attempt = await prisma.examAttempt.findUnique({ where: { id: params.attemptId } })
    if (!attempt || attempt.user_id !== user.id) {
      return NextResponse.json({ success: false, message: 'Exam not found' }, { status: 404 })
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ success: false, message: 'Exam already submitted' }, { status: 409 })
    }

    if (isExpired(attempt)) {
      await submitAttempt(attempt, user.id)
      return NextResponse.json({ success: false, message: 'Time is up', expired: true }, { status: 409 })
    }

    if (!attempt.question_ids.includes(questionId)) {
      return NextResponse.json({ success: false, message: 'Question not in this exam' }, { status: 400 })
    }

    const answers = { ...((attempt.answers ?? {}) as ExamAnswers) }
    const normalized = Array.from(new Set(selected.map((s: string) => s.trim()).filter(Boolean))).sort()
    if (normalized.length === 0) {
      delete answers[String(questionId)]
    } else {
      answers[String(questionId)] = normalized
    }

    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { answers },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[exam/answer] Error:', error)
    return NextResponse.json({ success: false, message: 'Failed to save answer' }, { status: 500 })
  }
}
