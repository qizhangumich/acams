import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import OpenAI from 'openai'

const prisma = new PrismaClient()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  timeout: 60000, // 60 second timeout
  maxRetries: 3 // Retry up to 3 times
})

interface Question {
  id: number
  explanation_ai_en?: string
  explanation?: string
  explanation_ai_ch?: string
}

interface QuestionsData {
  questions: Question[]
}

// Read questions.json
function loadQuestions(): Question[] {
  const content = fs.readFileSync('questions.json', 'utf-8')
  const data = JSON.parse(content) as QuestionsData
  return data.questions || data
}

// Save questions.json
function saveQuestions(questions: Question[]): void {
  const content = JSON.stringify(questions, null, 2)
  fs.writeFileSync('questions.json', content, 'utf-8')
}

// Translate explanation to Chinese with retry logic
async function translateToChinese(text: string, retries = 3): Promise<string> {
  if (!text || text.trim() === '') return ''

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the given English text to Chinese (Simplified). Keep technical terms and acronyms in English when appropriate. Provide only the translation without any additional commentary.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })

      return response.choices[0]?.message?.content?.trim() || ''
    } catch (error: any) {
      console.error(`  Attempt ${attempt}/${retries} failed:`, error.message || error.code || 'Unknown error')

      if (attempt === retries) {
        console.error('  All retries exhausted')
        return ''
      }

      // Exponential backoff: wait 2^attempt seconds before retry
      const waitTime = Math.pow(2, attempt) * 1000
      console.log(`  Waiting ${waitTime / 1000}s before retry...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  return ''
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY environment variable is not set')
    console.error('Please run: OPENAI_API_KEY="your-key" npx tsx scripts/add-chinese-explanations.ts')
    process.exit(1)
  }

  console.log('Loading questions.json...')
  const questions = loadQuestions()
  console.log(`Found ${questions.length} questions`)

  let processed = 0
  let skipped = 0
  let errors = 0

  // Count questions without Chinese explanations
  const questionsNeedingTranslation = questions.filter(q => {
    const explanationText = q.explanation_ai_en || q.explanation || ''
    return explanationText && !q.explanation_ai_ch
  })

  console.log(`Questions needing translation: ${questionsNeedingTranslation.length}`)

  // Process questions that don't have explanation_ai_ch yet
  for (const question of questions) {
    const explanationText = question.explanation_ai_en || question.explanation || ''

    if (!explanationText) {
      skipped++
      continue
    }

    if (question.explanation_ai_ch) {
      skipped++
      continue
    }

    console.log(`\nQuestion ${question.id}: Translating to Chinese...`)

    const chineseExplanation = await translateToChinese(explanationText, 5) // 5 retries

    if (chineseExplanation) {
      question.explanation_ai_ch = chineseExplanation
      processed++
      console.log(`Question ${question.id}: Translation complete`)

      // Save after every 5 translations to avoid losing progress
      if (processed % 5 === 0) {
        saveQuestions(questions)
        console.log(`Progress saved: ${processed}/${questionsNeedingTranslation.length} questions processed, ${errors} errors`)
      }
    } else {
      console.error(`Question ${question.id}: Translation failed`)
      errors++
    }

    // Longer delay between requests to avoid rate limiting (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Final save
  saveQuestions(questions)

  console.log('\n=== Summary ===')
  console.log(`Processed: ${processed} questions`)
  console.log(`Skipped: ${skipped} questions`)
  console.log(`Errors: ${errors} questions`)
  console.log(`Total: ${questions.length} questions`)

  await prisma.$disconnect()
}

main().catch(console.error)
