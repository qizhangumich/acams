/**
 * Import questions from questions.json into the database
 * 
 * Usage: npx tsx scripts/import-questions.ts
 */

import { prisma } from '../lib/prisma'
import fs from 'fs/promises'
import path from 'path'

async function importQuestions() {
  try {
    console.log('Loading questions.json...')
    const filePath = path.join(process.cwd(), 'questions.json')
    const fileContents = await fs.readFile(filePath, 'utf-8')
    const questions = JSON.parse(fileContents)

    if (!Array.isArray(questions)) {
      throw new Error('questions.json is not an array')
    }

    console.log(`Found ${questions.length} questions to import...`)

    let imported = 0
    let updated = 0
    let errors = 0

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      
      try {
        const result = await prisma.question.upsert({
          where: { id: q.id },
          update: {
            index: i,
            domain: q.domain,
            question_text: q.question,
            options: q.options,
            correct_answers: q.correct_answers,
            explanation: q.explanation,
            explanation_ai_en: q.explanation_ai_en || null,
            explanation_ai_ch: q.explanation_ai_ch || null,
            is_complete: q.is_complete || false,
            normalized_question: q.normalized_question || null,
          },
          create: {
            id: q.id,
            index: i,
            domain: q.domain,
            question_text: q.question,
            options: q.options,
            correct_answers: q.correct_answers,
            explanation: q.explanation,
            explanation_ai_en: q.explanation_ai_en || null,
            explanation_ai_ch: q.explanation_ai_ch || null,
            is_complete: q.is_complete || false,
            normalized_question: q.normalized_question || null,
          },
        })

        if (result) {
          // Check if it was created or updated by checking if it existed
          const existing = await prisma.question.findUnique({ where: { id: q.id } })
          if (existing && existing.index === i) {
            updated++
          } else {
            imported++
          }
        }

        if ((i + 1) % 100 === 0) {
          console.log(`Processed ${i + 1}/${questions.length} questions...`)
        }
      } catch (err) {
        console.error(`Error importing question ${q.id} (index ${i}):`, err)
        errors++
      }
    }

    console.log('\nImport complete!')
    console.log(`  Imported: ${imported}`)
    console.log(`  Updated: ${updated}`)
    console.log(`  Errors: ${errors}`)
    console.log(`  Total: ${questions.length}`)
  } catch (error) {
    console.error('Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

importQuestions()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Import failed:', error)
    process.exit(1)
  })

