/**
 * GET /api/questions/first
 *
 * Returns the first question from questions.json in the project root.
 */

import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

// This route reads from the filesystem at request time
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
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

    const firstQuestion = questions[0]

    return NextResponse.json({
      success: true,
      question: firstQuestion,
    })
  } catch (error) {
    console.error('[questions/first] Error reading questions.json:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load questions' },
      { status: 500 }
    )
  }
}


