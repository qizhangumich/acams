/**
 * POST /api/progress
 * 
 * Save user's answer and update progress
 * Also updates WrongBook if answer is wrong
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { updateLastQuestionId } from '@/lib/progress/restore'
import { z } from 'zod'

const requestSchema = z.object({
  question_id: z.number().int().positive(),
  selected_answer: z.array(z.string()).min(1),
  // Note: is_correct is optional - backend will verify independently
  is_correct: z.boolean().optional(),
})

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
    const { question_id, selected_answer } = requestSchema.parse(body)
    // Note: is_correct is ignored - backend verifies independently

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: question_id },
    })

    if (!question) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      )
    }

    // Backend verifies correctness (don't trust frontend)
    const correctAnswers = Array.isArray(question.correct_answers)
      ? question.correct_answers
      : [question.correct_answers]
    
    const isCorrectBackend =
      selected_answer.length === correctAnswers.length &&
      selected_answer.every((answer) => correctAnswers.includes(answer)) &&
      correctAnswers.every((answer) => selected_answer.includes(answer))

    // Determine status (backend is source of truth)
    const status = isCorrectBackend ? 'correct' : 'wrong'

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Upsert UserProgress
      const existingProgress = await tx.userProgress.findUnique({
        where: {
          user_id_question_id: {
            user_id: user.id,
            question_id: question_id,
          },
        },
      })

      if (existingProgress) {
        await tx.userProgress.update({
          where: {
            user_id_question_id: {
              user_id: user.id,
              question_id: question_id,
            },
          },
          data: {
            status,
            selected_answer,
            updated_at: new Date(),
          },
        })
      } else {
        await tx.userProgress.create({
          data: {
            user_id: user.id,
            question_id: question_id,
            status,
            selected_answer,
          },
        })
      }

      // Update WrongBook if answer is wrong
      if (!isCorrectBackend) {
        const existingWrong = await tx.wrongBook.findUnique({
          where: {
            user_id_question_id: {
              user_id: user.id,
              question_id: question_id,
            },
          },
        })

        if (existingWrong) {
          // Increment wrong_count (never decrease)
          await tx.wrongBook.update({
            where: {
              user_id_question_id: {
                user_id: user.id,
                question_id: question_id,
              },
            },
            data: {
              wrong_count: existingWrong.wrong_count + 1, // Always increment, never reset
              last_wrong_at: new Date(),
            },
          })
        } else {
          // Create new wrong book entry
          await tx.wrongBook.create({
            data: {
              user_id: user.id,
              question_id: question_id,
              wrong_count: 1,
              last_wrong_at: new Date(),
            },
          })
        }
      }

      // Update user's last question ID
      await updateLastQuestionId(user.id, question_id)
    })

    // Get updated progress
    const progress = await prisma.userProgress.findUnique({
      where: {
        user_id_question_id: {
          user_id: user.id,
          question_id: question_id,
        },
      },
      select: {
        status: true,
        selected_answer: true,
        updated_at: true,
      },
    })

    // Get wrong count if wrong
    let wrong_count = null
    if (!isCorrectBackend) {
      const wrongBook = await prisma.wrongBook.findUnique({
        where: {
          user_id_question_id: {
            user_id: user.id,
            question_id: question_id,
          },
        },
        select: {
          wrong_count: true,
        },
      })
      wrong_count = wrongBook?.wrong_count || null
    }

    return NextResponse.json({
      success: true,
      progress: {
        status: progress?.status,
        selected_answer: progress?.selected_answer,
        wrong_count,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error saving progress:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save progress' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/progress
 * 
 * Get user's overall progress or progress for a specific question
 * 
 * Query params:
 * - questionId (optional): Get progress for specific question
 */
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

    // Check if requesting specific question progress
    const { searchParams } = new URL(request.url)
    const questionIdParam = searchParams.get('questionId')

    if (questionIdParam) {
      // Get progress for specific question (READ-ONLY)
      const questionId = parseInt(questionIdParam)

      if (isNaN(questionId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid question ID' },
          { status: 400 }
        )
      }

      const progress = await prisma.userProgress.findUnique({
        where: {
          user_id_question_id: {
            user_id: user.id,
            question_id: questionId,
          },
        },
        select: {
          status: true,
          selected_answer: true,
          updated_at: true,
        },
      })

      // Get wrong count if wrong
      let wrong_count = null
      if (progress?.status === 'wrong') {
        const wrongBook = await prisma.wrongBook.findUnique({
          where: {
            user_id_question_id: {
              user_id: user.id,
              question_id: questionId,
            },
          },
          select: {
            wrong_count: true,
          },
        })
        wrong_count = wrongBook?.wrong_count || null
      }

      return NextResponse.json({
        success: true,
        progress: progress
          ? {
              status: progress.status,
              selected_answer: progress.selected_answer,
              wrong_count,
            }
          : null,
      })
    }

    // Get overall progress (existing logic)
    // Get total questions count
    const totalQuestions = await prisma.question.count()

    // Get user progress counts
    const progressCounts = await prisma.userProgress.groupBy({
      by: ['status'],
      where: { user_id: user.id },
      _count: true,
    })

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

    return NextResponse.json({
      success: true,
      total_questions: totalQuestions,
      completed,
      correct: counts.correct,
      wrong: counts.wrong,
      not_started,
      last_question_id: user.last_question_id,
    })
  } catch (error) {
    console.error('Error getting progress:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get progress' },
      { status: 500 }
    )
  }
}
