/**
 * Exam simulation service.
 *
 * Mock exams sample questions proportionally across domains (mirroring the
 * bank's domain mix), run against a countdown, and produce a scored report.
 * Wrong exam answers feed the wrong book and the spaced-repetition schedule.
 */

import { ExamAttempt, ExamStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recordAnswerForSrs } from '@/lib/review/srs'

export const EXAM_SIZES = [30, 60, 120] as const
export type ExamSize = (typeof EXAM_SIZES)[number]

export const FULL_EXAM_QUESTIONS = 120
export const FULL_EXAM_MINUTES = 210 // CAMS: 120 questions in 3.5 hours
export const PASS_THRESHOLD = 75 // percent

/** Grace period after time runs out before an attempt is force-submitted. */
const EXPIRY_GRACE_MS = 60 * 1000

export type ExamAnswers = Record<string, string[]>

export function durationForSize(size: ExamSize): number {
  return Math.round((FULL_EXAM_MINUTES * size) / FULL_EXAM_QUESTIONS)
}

export function remainingSeconds(attempt: Pick<ExamAttempt, 'started_at' | 'duration_min'>): number {
  const endsAt = attempt.started_at.getTime() + attempt.duration_min * 60 * 1000
  return Math.max(0, Math.round((endsAt - Date.now()) / 1000))
}

export function isExpired(attempt: Pick<ExamAttempt, 'started_at' | 'duration_min'>): boolean {
  const endsAt = attempt.started_at.getTime() + attempt.duration_min * 60 * 1000
  return Date.now() > endsAt + EXPIRY_GRACE_MS
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Sample `size` question ids with per-domain counts proportional to the
 * bank's domain mix (largest-remainder rounding), shuffled into exam order.
 */
export async function sampleExamQuestions(size: ExamSize): Promise<number[]> {
  const questions = await prisma.question.findMany({ select: { id: true, domain: true } })
  if (questions.length <= size) {
    return shuffle(questions.map((q) => q.id))
  }

  const byDomain = new Map<string, number[]>()
  for (const q of questions) {
    const ids = byDomain.get(q.domain) ?? []
    ids.push(q.id)
    byDomain.set(q.domain, ids)
  }

  const total = questions.length
  const allocations = Array.from(byDomain.entries()).map(([domain, ids]) => {
    const exact = (size * ids.length) / total
    return { domain, ids, count: Math.floor(exact), remainder: exact - Math.floor(exact) }
  })

  let allocated = allocations.reduce((sum, a) => sum + a.count, 0)
  allocations.sort((a, b) => b.remainder - a.remainder)
  for (let i = 0; allocated < size; i = (i + 1) % allocations.length) {
    if (allocations[i].count < allocations[i].ids.length) {
      allocations[i].count++
      allocated++
    }
  }

  const sampled: number[] = []
  for (const { ids, count } of allocations) {
    sampled.push(...shuffle(ids).slice(0, count))
  }
  return shuffle(sampled)
}

export async function getActiveAttempt(userId: string): Promise<ExamAttempt | null> {
  return prisma.examAttempt.findFirst({
    where: { user_id: userId, status: ExamStatus.in_progress },
    orderBy: { started_at: 'desc' },
  })
}

export async function startAttempt(userId: string, size: ExamSize): Promise<ExamAttempt> {
  const active = await getActiveAttempt(userId)
  if (active) {
    if (!isExpired(active)) {
      return active
    }
    await submitAttempt(active, userId)
  }

  const questionIds = await sampleExamQuestions(size)
  return prisma.examAttempt.create({
    data: {
      user_id: userId,
      question_ids: questionIds,
      duration_min: durationForSize(size),
    },
  })
}

export interface ExamQuestionResult {
  question_id: number
  domain: string
  selected: string[]
  correct_answers: string[]
  is_correct: boolean
}

export interface ExamReport {
  score: number
  passed: boolean
  correct_count: number
  total: number
  domain_stats: Record<string, { correct: number; total: number }>
  results: ExamQuestionResult[]
}

function answersEqual(selected: string[], correct: string[]): boolean {
  if (selected.length !== correct.length) return false
  const set = new Set(correct)
  return selected.every((s) => set.has(s))
}

export async function scoreAttempt(attempt: ExamAttempt): Promise<ExamReport> {
  const questions = await prisma.question.findMany({
    where: { id: { in: attempt.question_ids } },
    select: { id: true, domain: true, correct_answers: true },
  })
  const byId = new Map(questions.map((q) => [q.id, q]))
  const answers = (attempt.answers ?? {}) as ExamAnswers

  const domainStats: Record<string, { correct: number; total: number }> = {}
  const results: ExamQuestionResult[] = []
  let correctCount = 0

  for (const questionId of attempt.question_ids) {
    const question = byId.get(questionId)
    if (!question) continue
    const selected = answers[String(questionId)] ?? []
    const isCorrect = answersEqual(selected, question.correct_answers)
    if (isCorrect) correctCount++

    const stats = (domainStats[question.domain] ??= { correct: 0, total: 0 })
    stats.total++
    if (isCorrect) stats.correct++

    results.push({
      question_id: questionId,
      domain: question.domain,
      selected,
      correct_answers: question.correct_answers,
      is_correct: isCorrect,
    })
  }

  const total = results.length
  const score = total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0
  return {
    score,
    passed: score >= PASS_THRESHOLD,
    correct_count: correctCount,
    total,
    domain_stats: domainStats,
    results,
  }
}

/**
 * Finalize an attempt: score it, persist the report, and feed every miss
 * into the wrong book and the SRS schedule. Idempotent — an already
 * submitted attempt is returned unchanged.
 */
export async function submitAttempt(attempt: ExamAttempt, userId: string): Promise<ExamAttempt> {
  if (attempt.status === ExamStatus.submitted) {
    return attempt
  }

  const report = await scoreAttempt(attempt)

  const updated = await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: ExamStatus.submitted,
      submitted_at: new Date(),
      score: report.score,
      passed: report.passed,
      domain_stats: report.domain_stats,
    },
  })

  // Feed misses into wrong book + SRS (outside the score update so a partial
  // failure here never blocks the report).
  const wrong = report.results.filter((r) => !r.is_correct)
  for (const miss of wrong) {
    try {
      await prisma.wrongBook.upsert({
        where: { user_id_question_id: { user_id: userId, question_id: miss.question_id } },
        update: { wrong_count: { increment: 1 }, last_wrong_at: new Date() },
        create: { user_id: userId, question_id: miss.question_id },
      })
      await recordAnswerForSrs(prisma, userId, miss.question_id, false)
    } catch (error) {
      console.error('[exam] Failed to record miss for SRS:', miss.question_id, error)
    }
  }

  return updated
}
