/**
 * GET /api/progress/summary
 *
 * Returns progress summary for the current user:
 * - total: total number of questions
 * - done: count of UserProgress records for current user
 * - correct: count where status = 'correct'
 * - wrong: count where status = 'wrong'
 * - percent: done / total
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    // BREAKPOINT C FIX: Extract userId from session
    const user = await getUserFromSession(sessionToken)

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    const userId = user.id

    // BREAKPOINT C FIX: Get total number of questions (read-only, no filter needed)
    const total = await prisma.question.count()

    // BREAKPOINT C FIX: Get user progress counts - MUST filter by userId
    const [done, correct, wrong] = await Promise.all([
      // Total questions with progress for THIS user
      prisma.userProgress.count({
        where: { user_id: userId },
      }),
      // Questions answered correctly for THIS user
      prisma.userProgress.count({
        where: {
          user_id: userId,
          status: 'correct',
        },
      }),
      // Questions answered wrong for THIS user
      prisma.userProgress.count({
        where: {
          user_id: userId,
          status: 'wrong',
        },
      }),
    ])

    const percent = total > 0 ? Math.round((done / total) * 100) : 0

    return NextResponse.json({
      success: true,
      total,
      done,
      correct,
      wrong,
      percent,
    })
  } catch (error) {
    console.error('[progress/summary] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load progress summary' },
      { status: 500 }
    )
  }
}

