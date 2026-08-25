/**
 * POST /api/exam/[attemptId]/submit
 *
 * Submit an exam attempt for scoring. Idempotent.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/route-auth'
import { submitAttempt } from '@/lib/exam/service'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { attemptId: string } }) {
  try {
    const { user, error } = await requireUser(request)
    if (error) return error

    const attempt = await prisma.examAttempt.findUnique({ where: { id: params.attemptId } })
    if (!attempt || attempt.user_id !== user.id) {
      return NextResponse.json({ success: false, message: 'Exam not found' }, { status: 404 })
    }

    const submitted = await submitAttempt(attempt, user.id)

    return NextResponse.json({
      success: true,
      attemptId: submitted.id,
      score: submitted.score,
      passed: submitted.passed,
    })
  } catch (error) {
    console.error('[exam/submit] Error:', error)
    return NextResponse.json({ success: false, message: 'Failed to submit exam' }, { status: 500 })
  }
}
