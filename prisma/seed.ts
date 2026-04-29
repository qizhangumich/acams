/**
 * Database seed script.
 *
 * Loads questions from questions.json into the database.
 * Idempotent: can be run multiple times safely.
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
})

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
  console.log('Starting database seed...')

  const questionsPath = join(process.cwd(), 'questions.json')
  console.log(`Loading questions from: ${questionsPath}`)

  const questionsData: QuestionData[] = JSON.parse(readFileSync(questionsPath, 'utf-8'))
  console.log(`Found ${questionsData.length} questions`)

  const existingQuestions = await prisma.question.findMany({
    where: { id: { in: questionsData.map((question) => question.id) } },
    select: { id: true },
  })
  const existingQuestionIds = new Set(existingQuestions.map((question) => question.id))
  const created = questionsData.filter((question) => !existingQuestionIds.has(question.id)).length
  const updated = questionsData.length - created

  const chunkSize = 50
  for (let start = 0; start < questionsData.length; start += chunkSize) {
    const chunk = questionsData.slice(start, start + chunkSize)

    await prisma.$transaction(
      chunk.map((questionData, offset) => {
        const questionIndex = start + offset
        const data = {
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
        }

        return prisma.question.upsert({
          where: { id: questionData.id },
          create: {
            id: questionData.id,
            ...data,
          },
          update: data,
        })
      })
    )

    console.log(`Seeded ${Math.min(start + chunk.length, questionsData.length)} / ${questionsData.length}`)
  }

  console.log('Seed completed!')
  console.log(`   Created: ${created} questions`)
  console.log(`   Updated: ${updated} questions`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
