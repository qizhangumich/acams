/**
 * Add explanation_ai_en to questions_1.json
 *
 * Copies explanation_ai_en from questions.json to questions_1.json
 * based on matching question IDs.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface Question {
  id: number
  domain?: string
  question: string
  options: Record<string, string>
  correct_answers: string[] | string
  explanation?: string
  explanation_ai_en?: string
  explanation_ai_ch?: string
  is_complete?: boolean
  normalized_question?: string
}

function addEnglishExplanations() {
  const jsonPath = join(process.cwd(), 'questions_1.json')
  const sourcePath = join(process.cwd(), 'questions.json')

  console.log("Loading questions.json...")
  const sourceData = JSON.parse(readFileSync(sourcePath, 'utf-8'))

  console.log("Loading questions_1.json...")
  const targetData = JSON.parse(readFileSync(jsonPath, 'utf-8'))

  // Create a map for quick lookup
  const sourceMap = new Map<number, Question>()
  for (const q of sourceData) {
    sourceMap.set(q.id, q)
  }

  console.log("Adding explanation_ai_en to questions_1.json...")

  let added = 0
  let skipped = 0

  for (const question of targetData) {
    if (sourceMap.has(question.id)) {
      const sourceQuestion = sourceMap.get(question.id)
      if (sourceQuestion?.explanation_ai_en) {
        question.explanation_ai_en = sourceQuestion.explanation_ai_en
        added++
      } else {
        skipped++
      }
    } else {
      skipped++
    }
  }

  console.log(`\nSaving updated questions_1.json...`)
  writeFileSync(jsonPath, JSON.stringify(targetData, null, 2), 'utf-8')

  console.log("Done!")
  console.log(`\nAdded: ${added} explanations`)
  console.log(`Skipped: ${skipped} questions (no source found)`)
}

addEnglishExplanations()
