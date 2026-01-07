/**
 * POST /api/answer
 *
 * HARD, UNAVOIDABLE answer submission pipeline
 * 
 * Request body:
 * {
 *   questionId: number,
 *   selectedAnswers: string[]
 * }
 * 
 * Rules:
 * - userId MUST come from session
 * - Reject request if session.userId is missing
 * - questionId MUST match Question.id in database
 * - NEVER rely on frontend index alone
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 1. Get session
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    // 2. Extract userId from session
    const user = await getUserFromSession(sessionToken)

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    const userId = user.id

    // 3. Validate request body
    const body = await request.json()
    const { questionId, selectedAnswers } = body

    if (!questionId || typeof questionId !== 'number') {
      return NextResponse.json(
        { success: false, message: 'questionId is required and must be a number' },
        { status: 400 }
      )
    }

    if (!Array.isArray(selectedAnswers) || selectedAnswers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'selectedAnswers is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // 4. Validate question exists (questionId MUST match Question.id)
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        correct_answers: true,
      },
    })

    if (!question) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      )
    }

    // 5. Compare selectedAnswers with question.correct_answers
    const correctAnswers = Array.isArray(question.correct_answers)
      ? question.correct_answers
      : [question.correct_answers]

    const isCorrect =
      selectedAnswers.length === correctAnswers.length &&
      selectedAnswers.every((answer: string) => correctAnswers.includes(answer)) &&
      correctAnswers.every((answer: string) => selectedAnswers.includes(answer))

    const status = isCorrect ? 'correct' : 'wrong'

    // 6. Upsert UserProgress (MANDATORY - using prisma.userProgress.upsert)
    // Prisma compound unique constraint: @@unique([user_id, question_id])
    await prisma.userProgress.upsert({
      where: {
        user_id_question_id: {
          user_id: userId,
          question_id: questionId,
        },
      },
      update: {
        status,
        selected_answer: selectedAnswers,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        question_id: questionId,
        status,
        selected_answer: selectedAnswers,
      },
    })

    // 7. If wrong: Upsert WrongBook (increment wrong_count)
    if (!isCorrect) {
      const existingWrong = await prisma.wrongBook.findUnique({
        where: {
          user_id_question_id: {
            user_id: userId,
            question_id: questionId,
          },
        },
      })

      if (existingWrong) {
        await prisma.wrongBook.update({
          where: {
            user_id_question_id: {
              user_id: userId,
              question_id: questionId,
            },
          },
          data: {
            wrong_count: existingWrong.wrong_count + 1,
            last_wrong_at: new Date(),
          },
        })
      } else {
        await prisma.wrongBook.create({
          data: {
            user_id: userId,
            question_id: questionId,
            wrong_count: 1,
            last_wrong_at: new Date(),
          },
        })
      }
    }

    // 8. Log the write
    console.log('ANSWER SAVED', userId, questionId, status)

    // Return success response
    return NextResponse.json({
      success: true,
      status,
      selectedAnswers,
    })
  } catch (error) {
    console.error('[answer] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save answer' },
      { status: 500 }
    )
  }
}

