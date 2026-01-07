/**
 * Database Seed Script
 * 
 * Loads questions from questions.json into database
 * Idempotent: Can be run multiple times safely
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface QuestionData {
  id: number
  domain: string
  question: string
  options: Record<string, string>
  correct_answers: string[]
  explanation: string
  explanation_ai_en?: string
  explanation_ai_ch?: string
  is_complete?: boolean
  normalized_question?: string
}

async function main() {
  console.log('🌱 Starting database seed...')

  // Load questions from JSON
  const questionsPath = join(process.cwd(), 'questions.json')
  console.log(`📖 Loading questions from: ${questionsPath}`)

  const questionsData: QuestionData[] = JSON.parse(readFileSync(questionsPath, 'utf-8'))

  console.log(`📊 Found ${questionsData.length} questions`)

  // Upsert questions
  let created = 0
  let updated = 0

  for (let i = 0; i < questionsData.length; i++) {
    const questionData = questionsData[i]
    const questionIndex = i // 0-based index

    // Check if question already exists to determine if it's a create or update
    const existing = await prisma.question.findUnique({
      where: { id: questionData.id },
      select: { id: true },
    })

    if (existing) {
      // Update existing question
      await prisma.question.update({
        where: { id: questionData.id },
        data: {
          index: questionIndex,
          domain: questionData.domain,
          question_text: questionData.question,
          options: questionData.options,
          correct_answers: questionData.correct_answers,
          explanation: questionData.explanation,
          explanation_ai_en: questionData.explanation_ai_en || null,
          explanation_ai_ch: questionData.explanation_ai_ch || null,
          is_complete: questionData.is_complete ?? false,
          normalized_question: questionData.normalized_question || null,
        },
      })
      updated++
    } else {
      // Create new question
      await prisma.question.create({
        data: {
          id: questionData.id,
          index: questionIndex,
          domain: questionData.domain,
          question_text: questionData.question,
          options: questionData.options,
          correct_answers: questionData.correct_answers,
          explanation: questionData.explanation,
          explanation_ai_en: questionData.explanation_ai_en || null,
          explanation_ai_ch: questionData.explanation_ai_ch || null,
          is_complete: questionData.is_complete ?? false,
          normalized_question: questionData.normalized_question || null,
        },
      })
      created++
    }
  }

  console.log(`✅ Seed completed!`)
  console.log(`   Created: ${created} questions`)
  console.log(`   Updated: ${updated} questions`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

