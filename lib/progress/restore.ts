/**
 * User Progress Restore Logic
 * 
 * Handles resuming from last unfinished question
 * Implements clear status precedence rules
 */

import { prisma } from '@/lib/prisma'

export interface ResumeResult {
  questionId: number
  question: any // Question data
  progress?: {
    status: string
    selected_answer?: string[]
  }
}

/**
 * Resume from last unfinished question
 * 
 * Algorithm:
 * 1. Check User.last_question_id
 * 2. Find first question with status 'not_started' after last_question_id
 * 3. If none found, find first 'not_started' question overall
 * 4. If all completed, return last question
 * 
 * @param userId User ID
 * @returns Resume result with question ID and data
 */
export async function resumeFromLastQuestion(userId: string): Promise<ResumeResult | null> {
  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      last_question_id: true,
    },
  })

  if (!user) {
    return null
  }

  // Get all user progress
  const userProgress = await prisma.userProgress.findMany({
    where: { user_id: userId },
    select: {
      question_id: true,
      status: true,
      selected_answer: true,
    },
  })

  // Create map of question_id -> progress
  const progressMap = new Map(
    userProgress.map((p) => [p.question_id, { status: p.status, selected_answer: p.selected_answer }])
  )

  // Get all questions ordered by ID
  const allQuestions = await prisma.question.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      domain: true,
      question_text: true,
      options: true,
      correct_answers: true,
      explanation: true,
      explanation_ai_en: true,
      explanation_ai_ch: true,
    },
  })

  if (allQuestions.length === 0) {
    return null
  }

  // Strategy 1: Find first 'not_started' after last_question_id
  if (user.last_question_id) {
    const startIndex = allQuestions.findIndex((q) => q.id >= user.last_question_id!)
    if (startIndex !== -1) {
      for (let i = startIndex; i < allQuestions.length; i++) {
        const question = allQuestions[i]
        const progress = progressMap.get(question.id)
        if (!progress || progress.status === 'not_started') {
          return {
            questionId: question.id,
            question,
            progress: progress || { status: 'not_started' },
          }
        }
      }
    }
  }

  // Strategy 2: Find first 'not_started' overall
  for (const question of allQuestions) {
    const progress = progressMap.get(question.id)
    if (!progress || progress.status === 'not_started') {
      return {
        questionId: question.id,
        question,
        progress: progress || { status: 'not_started' },
      }
    }
  }

  // Strategy 3: All questions completed, return last question
  const lastQuestion = allQuestions[allQuestions.length - 1]
  const lastProgress = progressMap.get(lastQuestion.id)

  return {
    questionId: lastQuestion.id,
    question: lastQuestion,
    progress: lastProgress || { status: 'not_started' },
  }
}

/**
 * Get next question to work on
 * 
 * Status precedence:
 * 1. not_started (highest priority)
 * 2. wrong (medium priority - needs review)
 * 3. correct (lowest priority - already mastered)
 * 
 * @param userId User ID
 * @param currentQuestionId Current question ID (optional)
 * @returns Next question or null
 */
export async function getNextQuestion(
  userId: string,
  currentQuestionId?: number
): Promise<ResumeResult | null> {
  // Get all user progress
  const userProgress = await prisma.userProgress.findMany({
    where: { user_id: userId },
    select: {
      question_id: true,
      status: true,
      selected_answer: true,
    },
  })

  const progressMap = new Map(
    userProgress.map((p) => [p.question_id, { status: p.status, selected_answer: p.selected_answer }])
  )

  // Get all questions
  const allQuestions = await prisma.question.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      domain: true,
      question_text: true,
      options: true,
      correct_answers: true,
      explanation: true,
      explanation_ai_en: true,
      explanation_ai_ch: true,
    },
  })

  if (allQuestions.length === 0) {
    return null
  }

  // Find starting index
  let startIndex = 0
  if (currentQuestionId) {
    const foundIndex = allQuestions.findIndex((q) => q.id === currentQuestionId)
    if (foundIndex !== -1) {
      startIndex = foundIndex + 1
    }
  }

  // Priority 1: Find first 'not_started'
  for (let i = startIndex; i < allQuestions.length; i++) {
    const question = allQuestions[i]
    const progress = progressMap.get(question.id)
    if (!progress || progress.status === 'not_started') {
      return {
        questionId: question.id,
        question,
        progress: progress || { status: 'not_started' },
      }
    }
  }

  // Priority 2: Find first 'wrong' (needs review)
  for (let i = startIndex; i < allQuestions.length; i++) {
    const question = allQuestions[i]
    const progress = progressMap.get(question.id)
    if (progress?.status === 'wrong') {
      return {
        questionId: question.id,
        question,
        progress,
      }
    }
  }

  // Priority 3: Find first 'correct' (already mastered, but can review)
  for (let i = startIndex; i < allQuestions.length; i++) {
    const question = allQuestions[i]
    const progress = progressMap.get(question.id)
    if (progress?.status === 'correct') {
      return {
        questionId: question.id,
        question,
        progress,
      }
    }
  }

  // All questions processed, return first question
  const firstQuestion = allQuestions[0]
  const firstProgress = progressMap.get(firstQuestion.id)

  return {
    questionId: firstQuestion.id,
    question: firstQuestion,
    progress: firstProgress || { status: 'not_started' },
  }
}

/**
 * Update user's last question ID
 */
export async function updateLastQuestionId(userId: string, questionId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      last_question_id: questionId,
      last_active_at: new Date(),
    },
  })
}

