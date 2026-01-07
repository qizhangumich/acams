/**
 * GET /api/questions/by-index
 *
 * Returns a question from questions.json by its array index.
 *
 * Query params:
 * - index: number (0-based index in the questions array)
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

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

    if (index >= questions.length) {
      return NextResponse.json(
        { success: false, message: 'Index out of range' },
        { status: 400 }
      )
    }

    const question = questions[index]

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

    return NextResponse.json({
      success: true,
      index: index,
      totalQuestions: questions.length,
      question: normalizedQuestion,
    })
  } catch (error) {
    console.error('[questions/by-index] Error reading questions.json:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load question' },
      { status: 500 }
    )
  }
}

