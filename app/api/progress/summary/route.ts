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

    const user = await getUserFromSession(sessionToken)

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get total number of questions
    const total = await prisma.question.count()

    // Get user progress counts
    const [done, correct, wrong] = await Promise.all([
      // Total questions with progress
      prisma.userProgress.count({
        where: { user_id: user.id },
      }),
      // Questions answered correctly
      prisma.userProgress.count({
        where: {
          user_id: user.id,
          status: 'correct',
        },
      }),
      // Questions answered wrong
      prisma.userProgress.count({
        where: {
          user_id: user.id,
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

