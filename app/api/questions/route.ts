/**
 * GET /api/questions
 *
 * Returns a list of questions with optional filtering.
 *
 * Query params:
 * - filter: 'all' | 'done' | 'undone' | 'wrong'
 *
 * Returns minimal fields:
 * - id
 * - domain
 * - question_text
 * - status: 'correct' | 'wrong' | 'not_started'
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

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'

    let questions: Array<{
      id: number
      index: number
      domain: string
      question_text: string
      status: 'correct' | 'wrong' | 'not_started'
    }> = []

    if (filter === 'all') {
      // Get all questions with their progress status
      const allQuestions = await prisma.question.findMany({
        select: {
          id: true,
          index: true,
          domain: true,
          question_text: true,
        },
        orderBy: {
          index: 'asc',
        },
      })

      // Get user progress for all questions
      const userProgress = await prisma.userProgress.findMany({
        where: { user_id: user.id },
        select: {
          question_id: true,
          status: true,
        },
      })

      const progressMap = new Map(
        userProgress.map((p) => [p.question_id, p.status])
      )

      questions = allQuestions.map((q) => ({
        id: q.id,
        index: q.index,
        domain: q.domain,
        question_text: q.question_text,
        status: (progressMap.get(q.id) as 'correct' | 'wrong') || 'not_started',
      }))
    } else if (filter === 'done') {
      // Questions with UserProgress
      const doneQuestions = await prisma.userProgress.findMany({
        where: { user_id: user.id },
        select: {
          question: {
            select: {
              id: true,
              index: true,
              domain: true,
              question_text: true,
            },
          },
          status: true,
        },
        orderBy: {
          question: {
            index: 'asc',
          },
        },
      })

      questions = doneQuestions.map((up) => ({
        id: up.question.id,
        index: up.question.index,
        domain: up.question.domain,
        question_text: up.question.question_text,
        status: up.status as 'correct' | 'wrong',
      }))
    } else if (filter === 'undone') {
      // Questions NOT in UserProgress
      const allQuestionIds = await prisma.question.findMany({
        select: { id: true },
      })

      const doneQuestionIds = await prisma.userProgress.findMany({
        where: { user_id: user.id },
        select: { question_id: true },
      })

      const doneIdsSet = new Set(doneQuestionIds.map((d) => d.question_id))
      const undoneIds = allQuestionIds
        .filter((q) => !doneIdsSet.has(q.id))
        .map((q) => q.id)

      const undoneQuestions = await prisma.question.findMany({
        where: {
          id: { in: undoneIds },
        },
        select: {
          id: true,
          index: true,
          domain: true,
          question_text: true,
        },
        orderBy: {
          index: 'asc',
        },
      })

      questions = undoneQuestions.map((q) => ({
        id: q.id,
        index: q.index,
        domain: q.domain,
        question_text: q.question_text,
        status: 'not_started' as const,
      }))
    } else if (filter === 'wrong') {
      // Questions in WrongBook
      const wrongQuestions = await prisma.wrongBook.findMany({
        where: { user_id: user.id },
        select: {
          question: {
            select: {
              id: true,
              index: true,
              domain: true,
              question_text: true,
            },
          },
        },
        orderBy: {
          question: {
            index: 'asc',
          },
        },
      })

      questions = wrongQuestions.map((wb) => ({
        id: wb.question.id,
        index: wb.question.index,
        domain: wb.question.domain,
        question_text: wb.question.question_text,
        status: 'wrong' as const,
      }))
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid filter. Use: all, done, undone, wrong' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
    })
  } catch (error) {
    console.error('[questions] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load questions' },
      { status: 500 }
    )
  }
}

