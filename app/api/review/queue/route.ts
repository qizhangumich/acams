/**
 * GET /api/review/queue
 * 
 * Generate daily review queue (READ-ONLY, no persistence)
 * 
 * Returns:
 * - Daily review list
 * - Sorted by risk_score, wrong_count, and last_wrong_at
 * - Limited to 20 questions
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

    // 1. Get all wrong questions (READ-ONLY)
    const wrongQuestions = await prisma.wrongBook.findMany({
      where: { user_id: user.id },
      include: {
        question: {
          select: {
            id: true,
            domain: true,
            question_text: true,
          },
        },
      },
    })

    // 2. Get corresponding progress records
    const questionIds = wrongQuestions.map((w) => w.question_id)
    const progressRecords = await prisma.userProgress.findMany({
      where: {
        user_id: user.id,
        question_id: { in: questionIds },
      },
      select: {
        question_id: true,
        status: true,
      },
    })

    const progressMap = new Map<number, string>()
    progressRecords.forEach((p) => {
      progressMap.set(p.question_id, p.status)
    })

    // 3. Calculate risk scores and filter high-risk
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    const highRiskQuestions = wrongQuestions
      .map((wrong) => {
        const progress = progressMap.get(wrong.question_id)
        const hasCorrect = progress === 'correct'
        const totalAttempts = hasCorrect ? 1 + wrong.wrong_count : wrong.wrong_count
        const errorRate = totalAttempts > 0 ? wrong.wrong_count / totalAttempts : 1

        const lastWrongTime = new Date(wrong.last_wrong_at).getTime()
        const isRecent = lastWrongTime >= sevenDaysAgo

        const riskScore =
          Math.min(wrong.wrong_count, 2) * 30 +
          (isRecent ? 30 : 0) +
          (errorRate > 0.5 ? 10 : 0)

        return {
          question_id: wrong.question_id,
          wrong_count: wrong.wrong_count,
          last_wrong_at: wrong.last_wrong_at.toISOString(),
          domain: wrong.question.domain,
          question_text: wrong.question.question_text,
          risk_score: riskScore,
        }
      })
      .filter((q) => q.risk_score >= 50) // High-risk only

    // 4. Sort: risk_score desc, wrong_count desc, last_wrong_at desc
    highRiskQuestions.sort((a, b) => {
      if (b.risk_score !== a.risk_score) {
        return b.risk_score - a.risk_score
      }
      if (b.wrong_count !== a.wrong_count) {
        return b.wrong_count - a.wrong_count
      }
      return (
        new Date(b.last_wrong_at).getTime() - new Date(a.last_wrong_at).getTime()
      )
    })

    // 5. Limit to 20 questions (daily queue)
    const dailyQueue = highRiskQuestions.slice(0, 20)

    return NextResponse.json({
      success: true,
      queue: dailyQueue,
      total: dailyQueue.length,
    })
  } catch (error) {
    console.error('Error generating review queue:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to generate review queue' },
      { status: 500 }
    )
  }
}

