/**
 * GET /api/progress/resume
 * 
 * Get next question to resume from
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { resumeFromLastQuestion } from '@/lib/progress/restore'

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
      // User has progress, load question at that index
      const fs = await import('fs/promises')
      const path = await import('path')
      const filePath = path.join(process.cwd(), 'questions.json')
      const fileContents = await fs.readFile(filePath, 'utf-8')
      const questions = JSON.parse(fileContents)

      if (Array.isArray(questions) && questions.length > 0 && user.current_index < questions.length) {
        const question = questions[user.current_index]
        
        const normalizedQuestion = {
          id: question.id,
          domain: question.domain,
          question_text: question.question,
          options: question.options,
          correct_answers: question.correct_answers,
          explanation: question.explanation,
          explanation_ai_en: question.explanation_ai_en,
          explanation_ai_ch: question.explanation_ai_ch,
        }

        // Determine progress status from saved answers
        const savedAnswers = Array.isArray(user.current_answers) ? user.current_answers : []
        const correctAnswers = Array.isArray(question.correct_answers) ? question.correct_answers : [question.correct_answers]
        const isCorrect = savedAnswers.length === correctAnswers.length &&
          savedAnswers.every((a: string) => correctAnswers.includes(a)) &&
          correctAnswers.every((a: string) => savedAnswers.includes(a))

        return NextResponse.json({
          success: true,
          currentIndex: user.current_index,
          question: normalizedQuestion,
          progress: {
            status: isCorrect ? 'correct' : (savedAnswers.length > 0 ? 'wrong' : 'not_started'),
            selected_answer: savedAnswers,
          },
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

