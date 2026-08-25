/**
 * Smoke test for exam sampling and scoring logic (read-only, no writes).
 *
 * Usage: npx tsx scripts/smoke-exam.ts
 */

import { ExamAttempt } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { durationForSize, sampleExamQuestions, scoreAttempt } from '../lib/exam/service'

async function main() {
  // 1. Sampling: correct size, proportional domains, no duplicates
  for (const size of [30, 120] as const) {
    const ids = await sampleExamQuestions(size)
    if (ids.length !== size) throw new Error(`Expected ${size} questions, got ${ids.length}`)
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate questions sampled')

    const sampled = await prisma.question.findMany({
      where: { id: { in: ids } },
      select: { domain: true },
    })
    const counts = new Map<string, number>()
    sampled.forEach((q) => counts.set(q.domain, (counts.get(q.domain) ?? 0) + 1))
    console.log(`size=${size} duration=${durationForSize(size)}min domains:`)
    for (const [domain, count] of Array.from(counts.entries()).sort()) {
      console.log(`  ${count.toString().padStart(3)}  ${domain}`)
    }
  }

  // 2. Scoring: build a synthetic (non-persisted) attempt with known answers
  const ids = await sampleExamQuestions(30)
  const questions = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, correct_answers: true },
  })

  const answers: Record<string, string[]> = {}
  // Answer first 20 correctly, 5 wrong ("Z" is never a valid option), 5 blank
  questions.slice(0, 20).forEach((q) => (answers[String(q.id)] = [...q.correct_answers].sort()))
  questions.slice(20, 25).forEach((q) => (answers[String(q.id)] = ['Z']))

  const fakeAttempt = {
    id: 'smoke-test',
    user_id: 'smoke-test',
    status: 'in_progress',
    question_ids: ids,
    answers,
    duration_min: 53,
    started_at: new Date(),
    submitted_at: null,
    score: null,
    passed: null,
    domain_stats: null,
  } as unknown as ExamAttempt

  const report = await scoreAttempt(fakeAttempt)
  console.log(`score=${report.score}% correct=${report.correct_count}/${report.total} passed=${report.passed}`)
  if (report.correct_count !== 20) throw new Error(`Expected 20 correct, got ${report.correct_count}`)
  if (report.total !== 30) throw new Error(`Expected 30 total, got ${report.total}`)
  const expectedScore = Math.round((20 / 30) * 1000) / 10
  if (report.score !== expectedScore) throw new Error(`Expected score ${expectedScore}, got ${report.score}`)
  if (report.passed !== false) throw new Error('66.7% should not pass the 75% mark')

  const domainTotal = Object.values(report.domain_stats).reduce((sum, s) => sum + s.total, 0)
  if (domainTotal !== 30) throw new Error(`Domain stats total ${domainTotal} != 30`)

  console.log('Smoke test passed.')
}

main()
  .catch((e) => {
    console.error('Smoke test failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
