/**
 * Fix Failed Database Updates
 *
 * This script identifies and fixes questions that failed to update
 * due to data validation issues.
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

interface Question {
  id: number
  domain?: string
  question: string
  options: Record<string, string>
  correct_answers: string[] | string
  explanation?: string
}

const prisma = new PrismaClient()

async function fixFailedUpdates() {
  console.log("Loading questions.json...")
  const jsonPath = join(process.cwd(), 'questions.json')
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8')) as Question[]

  console.log(`Found ${data.length} questions`)

  let fixed = 0
  let errors = 0

  for (const questionData of data) {
    try {
      // Normalize correct_answers to array
      let normalizedAnswers: string[]
      if (Array.isArray(questionData.correct_answers)) {
        normalizedAnswers = questionData.correct_answers
      } else if (typeof questionData.correct_answers === 'string') {
        normalizedAnswers = [questionData.correct_answers]
      } else {
        normalizedAnswers = []
      }

      // Update question
      await prisma.question.upsert({
        where: { id: questionData.id },
        update: {
          domain: questionData.domain || '',
          question_text: questionData.question,
          options: questionData.options,
          correct_answers: normalizedAnswers,
          explanation: questionData.explanation || '',
        },
        create: {
          id: questionData.id,
          domain: questionData.domain || '',
          question_text: questionData.question,
          options: questionData.options,
          correct_answers: normalizedAnswers,
          explanation: questionData.explanation || '',
          explanation_ai_en: null,
          explanation_ai_ch: null,
          is_complete: false,
          normalized_question: null,
          index: 0,
        },
      })
      fixed++
      console.log(`✅ Fixed question ${questionData.id}`)
    } catch (error) {
      console.error(`❌ Error on question ${questionData.id}:`, (error as Error).message)
      errors++
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Fixed: ${fixed} questions`)
  console.log(`Errors: ${errors} questions`)
}

fixFailedUpdates()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
