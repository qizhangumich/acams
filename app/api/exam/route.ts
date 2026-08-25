/**
 * GET /api/exam
 *
 * List the user's exam attempts (most recent first) and the active
 * in-progress attempt, if any.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/route-auth'
import { getActiveAttempt, isExpired, remainingSeconds, submitAttempt } from '@/lib/exam/service'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireUser(request)
    if (error) return error

    let active = await getActiveAttempt(user.id)
    if (active && isExpired(active)) {
      await submitAttempt(active, user.id)
      active = null
    }

    const attempts = await prisma.examAttempt.findMany({
      where: { user_id: user.id, status: 'submitted' },
      orderBy: { started_at: 'desc' },
      take: 20,
      select: {
        id: true,
        started_at: true,
        submitted_at: true,
        duration_min: true,
        score: true,
        passed: true,
        question_ids: true,
      },
    })

    return NextResponse.json({
      success: true,
      active: active
        ? {
            id: active.id,
            started_at: active.started_at.toISOString(),
            duration_min: active.duration_min,
            total_questions: active.question_ids.length,
            remaining_seconds: remainingSeconds(active),
          }
        : null,
      attempts: attempts.map((a) => ({
        id: a.id,
        started_at: a.started_at.toISOString(),
        submitted_at: a.submitted_at?.toISOString() ?? null,
        duration_min: a.duration_min,
        score: a.score,
        passed: a.passed,
        total_questions: a.question_ids.length,
      })),
    })
  } catch (error) {
    console.error('[exam] Failed to list attempts:', error)
    return NextResponse.json({ success: false, message: 'Failed to load exams' }, { status: 500 })
  }
}
