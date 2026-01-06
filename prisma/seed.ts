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

  for (const questionData of questionsData) {
    const result = await prisma.question.upsert({
      where: { id: questionData.id },
      update: {
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
      create: {
        id: questionData.id,
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

    if (result) {
      // Check if it was created or updated (Prisma doesn't tell us directly)
      const existing = await prisma.question.findUnique({ where: { id: questionData.id } })
      if (existing && existing.created_at.getTime() === result.created_at.getTime()) {
        created++
      } else {
        updated++
      }
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

