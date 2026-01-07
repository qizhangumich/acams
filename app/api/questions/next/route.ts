/**
 * GET /api/questions/next
 *
 * Returns the next question from questions.json based on currentIndex.
 *
 * Query params:
 * - currentIndex: number (0-based index in the questions array)
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currentIndexParam = searchParams.get('currentIndex')

    if (currentIndexParam === null) {
      return NextResponse.json(
        { success: false, message: 'currentIndex is required' },
        { status: 400 }
      )
    }

    const currentIndex = Number(currentIndexParam)
    if (!Number.isFinite(currentIndex) || currentIndex < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid currentIndex' },
        { status: 400 }
      )
    }

    const filePath = path.join(process.cwd(), 'questions.json')
    const fileContents = await fs.readFile(filePath, 'utf-8')

    if (!fileContents.trim()) {
      return NextResponse.json(
        { success: false, message: 'No questions found' },
        { status: 200 }
      )
    }

    const questions = JSON.parse(fileContents)

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No questions found' },
        { status: 200 }
      )
    }

    const nextIndex = currentIndex + 1

    if (nextIndex >= questions.length) {
      return NextResponse.json(
        { success: false, message: 'No more questions' },
        { status: 200 }
      )
    }

    const nextQuestion = questions[nextIndex]

    const normalizedQuestion = {
      id: nextQuestion.id,
      domain: nextQuestion.domain,
      question_text: nextQuestion.question,
      options: nextQuestion.options,
      correct_answers: nextQuestion.correct_answers,
      explanation: nextQuestion.explanation,
      explanation_ai_en: nextQuestion.explanation_ai_en,
      explanation_ai_ch: nextQuestion.explanation_ai_ch,
    }

    return NextResponse.json({
      success: true,
      index: nextIndex,
      question: normalizedQuestion,
    })
  } catch (error) {
    console.error('[questions/next] Error reading questions.json:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load next question' },
      { status: 500 }
    )
  }
}


