/**
 * POST /api/exam/start
 *
 * Start a mock exam (or resume the active in-progress attempt).
 * Body: { size?: 30 | 60 | 120 } — defaults to the full 120-question exam.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/route-auth'
import { EXAM_SIZES, ExamSize, startAttempt } from '@/lib/exam/service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireUser(request)
    if (error) return error

    const body = await request.json().catch(() => ({}))
    const size: ExamSize = EXAM_SIZES.includes(body?.size) ? body.size : 120

    const attempt = await startAttempt(user.id, size)

    return NextResponse.json({ success: true, attemptId: attempt.id })
  } catch (error) {
    console.error('[exam/start] Error:', error)
    return NextResponse.json({ success: false, message: 'Failed to start exam' }, { status: 500 })
  }
}
