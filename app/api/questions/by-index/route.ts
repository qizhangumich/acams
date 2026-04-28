/**
 * GET /api/questions/by-index
 *
 * Returns a question from the database by its array index.
 *
 * Query params:
 * - index: number (0-based index in the questions array)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { getQuestionStateByIndex } from '@/lib/progress/service'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const indexParam = searchParams.get('index')

    if (indexParam === null) {
      return NextResponse.json(
        { success: false, message: 'index is required' },
        { status: 400 }
      )
    }

    const index = Number(indexParam)
    if (!Number.isFinite(index) || index < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid index' },
        { status: 400 }
      )
    }

    // Get total count to check if index is valid
    const totalQuestions = await prisma.question.count()

    if (index >= totalQuestions) {
      return NextResponse.json(
        { success: false, message: 'Index out of range' },
        { status: 400 }
      )
    }

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

    const state = await getQuestionStateByIndex(user.id, index)

    if (!state) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      index: state.currentIndex,
      totalQuestions,
      question: state.question,
      progress: state.progress,
    })
  } catch (error) {
    console.error('[questions/by-index] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load question' },
      { status: 500 }
    )
  }
}

