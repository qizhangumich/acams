/**
 * POST /api/questions/submit
 *
 * Submit answer for a question from questions.json
 * Minimal implementation that validates locally and always succeeds
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { questionId, selectedOptions, currentIndex } = body

    if (!questionId || !Array.isArray(selectedOptions) || selectedOptions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'questionId and selectedOptions are required' },
        { status: 400 }
      )
    }

    if (typeof currentIndex !== 'number' || currentIndex < 0) {
      return NextResponse.json(
        { success: false, message: 'currentIndex is required and must be a non-negative number' },
        { status: 400 }
      )
    }

    // Read questions.json
    const filePath = path.join(process.cwd(), 'questions.json')
    const fileContents = await fs.readFile(filePath, 'utf-8')
    const questions = JSON.parse(fileContents)

    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { success: false, message: 'Invalid questions data' },
        { status: 500 }
      )
    }

    // Find the question by ID
    const question = questions.find((q: any) => q.id === questionId)

    if (!question) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      )
    }

    // Validate answer locally
    const correctAnswers = Array.isArray(question.correct_answers)
      ? question.correct_answers
      : [question.correct_answers]

    const isCorrect =
      selectedOptions.length === correctAnswers.length &&
      selectedOptions.every((answer: string) => correctAnswers.includes(answer)) &&
      correctAnswers.every((answer: string) => selectedOptions.includes(answer))

    const status = isCorrect ? 'correct' : 'wrong'

    // Persist progress: update user's current_index and current_answers
    await prisma.user.update({
      where: { id: user.id },
      data: {
        current_index: currentIndex,
        current_answers: selectedOptions,
        last_active_at: new Date(),
        last_question_id: questionId,
      },
    })

    // Return success response
    return NextResponse.json({
      success: true,
      progress: {
        status,
        selected_answer: selectedOptions,
        wrong_count: isCorrect ? undefined : 1,
      },
    })
  } catch (error) {
    console.error('[questions/submit] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to submit answer' },
      { status: 500 }
    )
  }
}

