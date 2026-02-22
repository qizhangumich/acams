/**
 * Generate Chinese Explanations for questions_1.json
 *
 * Uses OpenAI API to generate Chinese translations/explanations
 * and adds them as explanation_ai_ch field to each question.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Question {
  id: number
  domain?: string
  question: string
  options: Record<string, string>
  correct_answers: string[] | string
  explanation?: string
  is_complete?: boolean
  normalized_question?: string
}

interface QuestionWithAI extends Question {
  explanation_ai_en?: string
  explanation_ai_ch?: string
}

const systemPrompt = `You are an expert ACAMS (Anti-Money Laundering Specialist) exam instructor.
Your task is to provide a Chinese explanation for exam questions about AML/CFT compliance.

For each question:
1. Identify the correct answer(s)
2. Explain WHY the correct answer is correct in Chinese
3. Explain WHY the incorrect answers are wrong in Chinese
4. Use professional terminology
5. Be clear and educational

Format your response in Chinese only, with clear sections:

### 正确答案
[Explanation of why the correct answer is correct]

### 错误选项
[Explanation of why each incorrect answer is wrong]

### 总结
[Brief summary]`;

async function generateChineseExplanation(question: QuestionWithAI): Promise<string> {
  const questionText = question.question
  const options = question.options
  const correctAnswers = Array.isArray(question.correct_answers)
    ? question.correct_answers
    : [question.correct_answers]

  let optionsText = "\n"
  for (const [letter, text] of Object.entries(options)) {
    const isCorrect = correctAnswers.includes(letter)
    optionsText += `${isCorrect ? '✓' : '✗'} ${letter}. ${text}\n`
  }

  const userPrompt = `Question: ${questionText}

Options:
${optionsText}

Correct Answer(s): ${correctAnswers.join(', ')}

Please provide a Chinese explanation following the format above.`

The user wants to learn and understand the material, so be thorough and educational. Make sure your explanation is in Chinese only, no English.`

Remember: Return ONLY the Chinese explanation, no English at all. No markdown formatting, just plain Chinese text.`

### 正确答案

### 错误选项

### 总结`

Explain the correct answers clearly and why the incorrect answers are wrong. Focus on practical application in AML/CFT compliance.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    return response.choices[0].message.content || ""
  } catch (error) {
    console.error(`Error generating Chinese explanation for question ${question.id}:`, error)
    return ""
  }
}

async function processQuestions() {
  const jsonPath = join(process.cwd(), 'questions_1.json')

  console.log("Loading questions_1.json...")
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8')) as QuestionWithAI[]

  console.log(`Found ${data.length} questions`)

  console.log("\nGenerating Chinese explanations...")

  // Process in batches of 10 to avoid overwhelming the API
  const batchSize = 10
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}...`)

    for (const question of batch) {
      if (!question.explanation_ai_ch) {
        console.log(`  Question ${question.id}...`)
        question.explanation_ai_ch = await generateChineseExplanation(question)
      }
    }
  }

  console.log("\nSaving updated questions_1.json...")
  writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8')

  console.log("Done!")
}

processQuestions()
  .then(() => {
    console.log("\n✅ Chinese explanations generated successfully!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error:", error)
    process.exit(1)
  })
