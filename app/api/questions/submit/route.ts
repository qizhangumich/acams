/**
 * POST /api/questions/submit
 *
 * Submit answer for a question from the database
 * Validates answer and persists user progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

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

    // BREAKPOINT B FIX: Extract userId ONLY from session
    const user = await getUserFromSession(sessionToken)

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    // BREAKPOINT B FIX: Debug log
    const userId = user.id
    console.log('DB WRITE USER:', userId)

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

    // Get question from database
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

    // Validate answer locally
    const correctAnswers = Array.isArray(question.correct_answers)
      ? question.correct_answers
      : [question.correct_answers]

    const isCorrect =
      selectedOptions.length === correctAnswers.length &&
      selectedOptions.every((answer: string) => correctAnswers.includes(answer)) &&
      correctAnswers.every((answer: string) => selectedOptions.includes(answer))

    const status = isCorrect ? 'correct' : 'wrong'

    // BREAKPOINT B FIX: Use userId from session (never from request body)
    // Persist progress in a transaction
    await prisma.$transaction(async (tx) => {
      // Update user's current_index and current_answers
      await tx.user.update({
        where: { id: userId },
        data: {
          current_index: currentIndex,
          current_answers: selectedOptions,
          last_active_at: new Date(),
          last_question_id: questionId,
        },
      })

      // Upsert UserProgress (required for progress summary)
      const existingProgress = await tx.userProgress.findUnique({
        where: {
          user_id_question_id: {
            user_id: userId,
            question_id: questionId,
          },
        },
      })

      if (existingProgress) {
        await tx.userProgress.update({
          where: {
            user_id_question_id: {
              user_id: userId,
              question_id: questionId,
            },
          },
          data: {
            status,
            selected_answer: selectedOptions,
            updated_at: new Date(),
          },
        })
      } else {
        await tx.userProgress.create({
          data: {
            user_id: userId,
            question_id: questionId,
            status,
            selected_answer: selectedOptions,
          },
        })
      }

      // Update WrongBook if answer is wrong
      if (!isCorrect) {
        const existingWrong = await tx.wrongBook.findUnique({
          where: {
            user_id_question_id: {
              user_id: userId,
              question_id: questionId,
            },
          },
        })

        if (existingWrong) {
          await tx.wrongBook.update({
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
          await tx.wrongBook.create({
            data: {
              user_id: userId,
              question_id: questionId,
              wrong_count: 1,
              last_wrong_at: new Date(),
            },
          })
        }
      }
    })

    // Get wrong count if wrong
    let wrong_count = undefined
    if (!isCorrect) {
      const wrongBook = await prisma.wrongBook.findUnique({
        where: {
          user_id_question_id: {
            user_id: userId,
            question_id: questionId,
          },
        },
        select: {
          wrong_count: true,
        },
      })
      wrong_count = wrongBook?.wrong_count || 1
    }

    // Return success response
    return NextResponse.json({
      success: true,
      progress: {
        status,
        selected_answer: selectedOptions,
        wrong_count,
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

