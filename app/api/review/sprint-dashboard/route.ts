/**
 * GET /api/review/sprint-dashboard
 * 
 * Get sprint dashboard data (READ-ONLY)
 * 
 * Returns:
 * - High-risk summary
 * - Domain risk aggregation
 * - High-risk questions list
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

    // 2. Get corresponding progress records (for error rate calculation)
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

    // Create progress map
    const progressMap = new Map<number, string>()
    progressRecords.forEach((p) => {
      progressMap.set(p.question_id, p.status)
    })

    // 3. Calculate risk scores
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    const highRiskQuestions = wrongQuestions
      .map((wrong) => {
        const progress = progressMap.get(wrong.question_id)
        
        // Calculate error rate
        // If user got it correct at least once, total attempts = correct attempts + wrong attempts
        // Otherwise, total attempts = wrong attempts only
        const hasCorrect = progress === 'correct'
        const totalAttempts = hasCorrect ? 1 + wrong.wrong_count : wrong.wrong_count
        const errorRate = totalAttempts > 0 ? wrong.wrong_count / totalAttempts : 1

        // Check if recent (within 7 days)
        const lastWrongTime = new Date(wrong.last_wrong_at).getTime()
        const isRecent = lastWrongTime >= sevenDaysAgo

        // Calculate risk score (0-100)
        const riskScore =
          Math.min(wrong.wrong_count, 2) * 30 + // Wrong count (max 2, 60 points)
          (isRecent ? 30 : 0) + // Recent mistake (30 points)
          (errorRate > 0.5 ? 10 : 0) // Error rate > 50% (10 points)

        return {
          question_id: wrong.question_id,
          wrong_count: wrong.wrong_count,
          last_wrong_at: wrong.last_wrong_at.toISOString(),
          domain: wrong.question.domain,
          question_text: wrong.question.question_text,
          risk_score: riskScore,
          is_high_risk: riskScore >= 50,
        }
      })
      .filter((q) => q.is_high_risk)

    // 4. Aggregate by domain
    const domainRiskMap = new Map<
      string,
      { high_risk_count: number; total_wrong: number }
    >()

    wrongQuestions.forEach((wrong) => {
      const domain = wrong.question.domain
      if (!domainRiskMap.has(domain)) {
        domainRiskMap.set(domain, { high_risk_count: 0, total_wrong: 0 })
      }
      const stats = domainRiskMap.get(domain)!
      stats.total_wrong++
      if (highRiskQuestions.some((hr) => hr.question_id === wrong.question_id)) {
        stats.high_risk_count++
      }
    })

    const domainRisk = Array.from(domainRiskMap.entries()).map(([domain, stats]) => ({
      domain,
      high_risk_count: stats.high_risk_count,
      total_wrong: stats.total_wrong,
    }))

    domainRisk.sort((a, b) => a.domain.localeCompare(b.domain))

    // 5. Calculate summary
    const recentMistakes = wrongQuestions.filter((w) => {
      const lastWrongTime = new Date(w.last_wrong_at).getTime()
      return lastWrongTime >= sevenDaysAgo
    }).length

    return NextResponse.json({
      success: true,
      summary: {
        total_high_risk: highRiskQuestions.length,
        recent_mistakes: recentMistakes,
        total_wrong: wrongQuestions.length,
      },
      domain_risk: domainRisk,
      high_risk_questions: highRiskQuestions,
    })
  } catch (error) {
    console.error('Error getting sprint dashboard:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get sprint dashboard' },
      { status: 500 }
    )
  }
}

