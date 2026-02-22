/**
 * Update Production Database from Fixed questions.json
 *
 * This script reads the fixed questions.json and updates all questions
 * in the production database with word boundary fixes applied.
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

interface QuestionData {
  id: number
  domain: string
  question: string
  options: Record<string, string>
  correct_answers: string[] | string
  explanation: string
  explanation_ai_en?: string
  explanation_ai_ch?: string
}

const prisma = new PrismaClient()

// Normalize correct_answers to always be an array
function normalizeCorrectAnswers(correct_answers: string[] | string): string[] {
  if (Array.isArray(correct_answers)) {
    return correct_answers
  }
  // If it's a string like "A", convert to ["A"]
  return [correct_answers]
}

async function updateDatabaseFromJSON() {
  console.log('Loading questions.json...')

  const jsonPath = join(process.cwd(), 'questions.json')
  const questionsData: QuestionData[] = JSON.parse(
    readFileSync(jsonPath, 'utf-8')
  )

  console.log(`Found ${questionsData.length} questions in questions.json`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const questionData of questionsData) {
    try {
      // Normalize correct_answers to array
      const normalizedAnswers = normalizeCorrectAnswers(questionData.correct_answers)

      // Check if question exists in database
      const existing = await prisma.question.findUnique({
        where: { id: questionData.id },
        select: {
          id: true,
          question_text: true,
          options: true,
          explanation_ai_en: true,
          explanation_ai_ch: true,
        },
      })

      if (!existing) {
        console.log(`  Question ${questionData.id}: Not found in database, creating...`)
        await prisma.question.create({
          data: {
            id: questionData.id,
            index: questionData.id - 1, // 0-based index
            domain: questionData.domain,
            question_text: questionData.question,
            options: questionData.options,
            correct_answers: normalizedAnswers,
            explanation: questionData.explanation,
            explanation_ai_en: questionData.explanation_ai_en || null,
            explanation_ai_ch: questionData.explanation_ai_ch || null,
          },
        })
        updated++
      } else {
        // Compare with existing data to see if update is needed
        const needsUpdate =
          JSON.stringify(existing.options) !==
          JSON.stringify(questionData.options) ||
          existing.explanation_ai_en !== (questionData.explanation_ai_en || null) ||
          existing.explanation_ai_ch !== (questionData.explanation_ai_ch || null)

        if (needsUpdate) {
          console.log(`  Question ${questionData.id}: Updating...`)
          await prisma.question.update({
            where: { id: questionData.id },
            data: {
              domain: questionData.domain,
              question_text: questionData.question,
              options: questionData.options,
              correct_answers: normalizedAnswers,
              explanation: questionData.explanation,
              explanation_ai_en: questionData.explanation_ai_en || null,
              explanation_ai_ch: questionData.explanation_ai_ch || null,
            },
          })
          updated++
        } else {
          skipped++
        }
      }
    } catch (error) {
      console.error(`  Error updating question ${questionData.id}:`, error)
      errors++
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Updated: ${updated} questions`)
  console.log(`Skipped: ${skipped} questions (already up to date)`)
  console.log(`Errors: ${errors} questions`)
}

async function main() {
  try {
    await updateDatabaseFromJSON()
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
