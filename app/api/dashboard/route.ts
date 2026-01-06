/**
 * GET /api/dashboard
 * 
 * Get dashboard statistics (READ-ONLY)
 * 
 * Returns:
 * - Overall stats (total / completed / correct / wrong / not_started)
 * - Domain-level aggregation
 * - Last question ID (for Resume button)
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

    // 1. Get total questions count (READ-ONLY)
    const totalQuestions = await prisma.question.count()

    // 2. Get user progress counts (READ-ONLY)
    const progressCounts = await prisma.userProgress.groupBy({
      by: ['status'],
      where: { user_id: user.id },
      _count: true,
    })

    // 3. Calculate overall stats
    const counts = {
      not_started: 0,
      correct: 0,
      wrong: 0,
    }

    progressCounts.forEach((item) => {
      counts[item.status as keyof typeof counts] = item._count
    })

    const completed = counts.correct + counts.wrong
    const not_started = totalQuestions - completed

    // 4. Get domain-level aggregation (READ-ONLY)
    const progressWithDomain = await prisma.userProgress.findMany({
      where: { user_id: user.id },
      include: {
        question: {
          select: {
            domain: true,
          },
        },
      },
    })

    // 5. Aggregate by domain
    const domainStatsMap = new Map<string, { correct: number; wrong: number; total: number }>()

    progressWithDomain.forEach((progress) => {
      const domain = progress.question.domain
      if (!domainStatsMap.has(domain)) {
        domainStatsMap.set(domain, { correct: 0, wrong: 0, total: 0 })
      }

      const stats = domainStatsMap.get(domain)!
      stats.total++
      if (progress.status === 'correct') {
        stats.correct++
      } else if (progress.status === 'wrong') {
        stats.wrong++
      }
    })

    // Convert to array format
    const domainStats = Array.from(domainStatsMap.entries()).map(([domain, stats]) => ({
      domain,
      correct: stats.correct,
      wrong: stats.wrong,
      total: stats.total,
    }))

    // Sort by domain name
    domainStats.sort((a, b) => a.domain.localeCompare(b.domain))

    return NextResponse.json({
      success: true,
      stats: {
        total_questions: totalQuestions,
        completed,
        correct: counts.correct,
        wrong: counts.wrong,
        not_started,
      },
      domain_stats: domainStats,
      last_question_id: user.last_question_id,
    })
  } catch (error) {
    console.error('Error getting dashboard data:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get dashboard data' },
      { status: 500 }
    )
  }
}

