/**
 * GET /api/progress/resume
 * 
 * Get next question to resume from
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

    // Check if user has saved progress (current_index)
    if (user.current_index !== null && user.current_index !== undefined) {
      // User has progress, load question at that index from database
      const question = await prisma.question.findUnique({
        where: { index: user.current_index },
        select: {
          id: true,
          index: true,
          domain: true,
          question_text: true,
          options: true,
          correct_answers: true,
          explanation: true,
          explanation_ai_en: true,
          explanation_ai_ch: true,
        },
      })

      if (question) {
        // Determine progress status from saved answers
        const savedAnswers = Array.isArray(user.current_answers) 
          ? (user.current_answers as string[])
          : []
        const correctAnswers = Array.isArray(question.correct_answers) 
          ? question.correct_answers 
          : [question.correct_answers]
        const isCorrect = savedAnswers.length === correctAnswers.length &&
          savedAnswers.every((a: string) => correctAnswers.includes(a)) &&
          correctAnswers.every((a: string) => savedAnswers.includes(a))

        // Get total questions count
        const totalQuestions = await prisma.question.count()

        return NextResponse.json({
          success: true,
          currentIndex: user.current_index,
          question,
          progress: {
            status: isCorrect ? 'correct' : (savedAnswers.length > 0 ? 'wrong' : 'not_started'),
            selected_answer: savedAnswers,
          },
          totalQuestions,
        })
      }
    }

    // No progress found, return success: false
    return NextResponse.json({
      success: false,
      message: 'No saved progress',
    })
  } catch (error) {
    console.error('[resume] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to resume progress' },
      { status: 500 }
    )
  }
}

