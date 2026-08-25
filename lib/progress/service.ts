import { Prisma, ProgressStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recordAnswerForSrs } from '@/lib/review/srs'

export const questionDetailSelect = {
  id: true,
  index: true,
  domain: true,
  question_text: true,
  options: true,
  correct_answers: true,
  explanation: true,
  explanation_ai_en: true,
  explanation_ai_ch: true,
} satisfies Prisma.QuestionSelect

type QuestionDetail = Prisma.QuestionGetPayload<{
  select: typeof questionDetailSelect
}>

type UserQuestionProgress = {
  status: ProgressStatus
  selected_answer: string[]
}

export interface ProgressSnapshot {
  status: 'not_started' | 'correct' | 'wrong'
  selected_answer: string[]
  wrong_count?: number
}

export interface QuestionState {
  question: QuestionDetail
  currentIndex: number
  totalQuestions: number
  progress: ProgressSnapshot
}

export interface SubmitAnswerInput {
  userId: string
  questionId: number
  selectedAnswers: string[]
  currentIndex?: number
}

function normalizeAnswers(selectedAnswers: string[]): string[] {
  return Array.from(new Set(selectedAnswers.map((answer) => answer.trim()).filter(Boolean))).sort()
}

function areAnswersEqual(selectedAnswers: string[], correctAnswers: string[]): boolean {
  return (
    selectedAnswers.length === correctAnswers.length &&
    selectedAnswers.every((answer) => correctAnswers.includes(answer))
  )
}

async function getProgressSnapshot(
  userId: string,
  questionId: number,
  progress?: UserQuestionProgress | null
): Promise<ProgressSnapshot> {
  if (!progress) {
    return {
      status: 'not_started',
      selected_answer: [],
    }
  }

  let wrong_count: number | undefined
  if (progress.status === 'wrong') {
    const wrongBook = await prisma.wrongBook.findUnique({
      where: {
        user_id_question_id: {
          user_id: userId,
          question_id: questionId,
        },
      },
      select: {
        wrong_count: true,
      },
    })

    wrong_count = wrongBook?.wrong_count
  }

  return {
    status: progress.status,
    selected_answer: progress.selected_answer,
    wrong_count,
  }
}

export async function getQuestionById(questionId: number): Promise<QuestionDetail | null> {
  return prisma.question.findUnique({
    where: { id: questionId },
    select: questionDetailSelect,
  })
}

export async function getQuestionByIndex(index: number): Promise<QuestionDetail | null> {
  return prisma.question.findUnique({
    where: { index },
    select: questionDetailSelect,
  })
}

export async function getQuestionStateById(userId: string, questionId: number): Promise<QuestionState | null> {
  const [question, totalQuestions, progress] = await Promise.all([
    getQuestionById(questionId),
    prisma.question.count(),
    prisma.userProgress.findUnique({
      where: {
        user_id_question_id: {
          user_id: userId,
          question_id: questionId,
        },
      },
      select: {
        status: true,
        selected_answer: true,
      },
    }),
  ])

  if (!question) {
    return null
  }

  return {
    question,
    currentIndex: question.index,
    totalQuestions,
    progress: await getProgressSnapshot(userId, question.id, progress),
  }
}

export async function getQuestionStateByIndex(userId: string, index: number): Promise<QuestionState | null> {
  const question = await getQuestionByIndex(index)
  if (!question) {
    return null
  }

  return getQuestionStateById(userId, question.id)
}

export async function getResumeQuestionState(userId: string): Promise<QuestionState | null> {
  const [user, totalQuestions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        current_index: true,
        last_question_id: true,
      },
    }),
    prisma.question.count(),
  ])

  if (!user || totalQuestions === 0) {
    return null
  }

  if (typeof user.current_index === 'number') {
    const currentState = await getQuestionStateByIndex(userId, user.current_index)
    if (currentState) {
      return currentState
    }
  }

  const [questions, progressRows] = await Promise.all([
    prisma.question.findMany({
      select: {
        id: true,
        index: true,
      },
      orderBy: {
        index: 'asc',
      },
    }),
    prisma.userProgress.findMany({
      where: { user_id: userId },
      select: {
        question_id: true,
      },
    }),
  ])

  const completedIds = new Set(progressRows.map((row) => row.question_id))
  const firstUnanswered = questions.find((question) => !completedIds.has(question.id))
  if (firstUnanswered) {
    return getQuestionStateById(userId, firstUnanswered.id)
  }

  if (typeof user.last_question_id === 'number') {
    const lastState = await getQuestionStateById(userId, user.last_question_id)
    if (lastState) {
      return lastState
    }
  }

  const lastQuestion = questions[questions.length - 1]
  return lastQuestion ? getQuestionStateById(userId, lastQuestion.id) : null
}

export async function updateCurrentQuestionIndex(userId: string, currentIndex: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      current_index: currentIndex,
      current_answers: Prisma.JsonNull,
      last_active_at: new Date(),
    },
  })
}

export async function submitQuestionAnswer(input: SubmitAnswerInput) {
  const selectedAnswers = normalizeAnswers(input.selectedAnswers)
  if (selectedAnswers.length === 0) {
    throw new Error('selectedAnswers must contain at least one option')
  }

  const question = await prisma.question.findUnique({
    where: { id: input.questionId },
    select: {
      id: true,
      index: true,
      correct_answers: true,
    },
  })

  if (!question) {
    return null
  }

  if (
    typeof input.currentIndex === 'number' &&
    input.currentIndex >= 0 &&
    input.currentIndex !== question.index
  ) {
    throw new Error('Question index does not match question ID')
  }

  const status: ProgressStatus = areAnswersEqual(selectedAnswers, [...question.correct_answers].sort())
    ? 'correct'
    : 'wrong'

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: {
        current_index: question.index,
        current_answers: selectedAnswers,
        last_question_id: question.id,
        last_active_at: new Date(),
      },
    })

    await tx.userProgress.upsert({
      where: {
        user_id_question_id: {
          user_id: input.userId,
          question_id: question.id,
        },
      },
      update: {
        status,
        selected_answer: selectedAnswers,
        updated_at: new Date(),
      },
      create: {
        user_id: input.userId,
        question_id: question.id,
        status,
        selected_answer: selectedAnswers,
      },
    })

    if (status === 'wrong') {
      const existingWrong = await tx.wrongBook.findUnique({
        where: {
          user_id_question_id: {
            user_id: input.userId,
            question_id: question.id,
          },
        },
        select: {
          wrong_count: true,
        },
      })

      if (existingWrong) {
        await tx.wrongBook.update({
          where: {
            user_id_question_id: {
              user_id: input.userId,
              question_id: question.id,
            },
          },
          data: {
            wrong_count: existingWrong.wrong_count + 1,
            last_wrong_at: new Date(),
          },
        })
      } else {
        await tx.wrongBook.create({
          data: {
            user_id: input.userId,
            question_id: question.id,
            wrong_count: 1,
            last_wrong_at: new Date(),
          },
        })
      }
    }

    await recordAnswerForSrs(tx, input.userId, question.id, status === 'correct')
  })

  const progress = await prisma.userProgress.findUnique({
    where: {
      user_id_question_id: {
        user_id: input.userId,
        question_id: question.id,
      },
    },
    select: {
      status: true,
      selected_answer: true,
    },
  })

  return {
    questionId: question.id,
    currentIndex: question.index,
    progress: await getProgressSnapshot(input.userId, question.id, progress),
  }
}
