/**
 * Spaced-repetition scheduling (SM-2 lite).
 *
 * A ReviewCard is created the first time a user answers a question wrong.
 * Every subsequent answer (practice, review session, or exam) updates the
 * card's schedule:
 *   - wrong  -> lapse: reset reps, shrink ease, due immediately
 *   - correct -> grow the interval (1d, 3d, then interval * ease)
 *
 * Questions the user has never missed do not get cards — review time is
 * spent only where it pays off.
 */

import { Prisma, PrismaClient } from '@prisma/client'

type Db = Prisma.TransactionClient | PrismaClient

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_EASE = 1.3
const MAX_EASE = 2.8

export async function recordAnswerForSrs(
  db: Db,
  userId: string,
  questionId: number,
  correct: boolean
): Promise<void> {
  const where = {
    user_id_question_id: { user_id: userId, question_id: questionId },
  }
  const existing = await db.reviewCard.findUnique({ where })
  const now = new Date()

  if (!existing) {
    if (correct) return
    await db.reviewCard.create({
      data: {
        user_id: userId,
        question_id: questionId,
        lapses: 1,
        due_at: now,
        last_reviewed_at: now,
      },
    })
    return
  }

  if (correct) {
    const reps = existing.reps + 1
    const intervalDays =
      reps === 1 ? 1 : reps === 2 ? 3 : Math.max(existing.interval_days * existing.ease, existing.interval_days + 1)
    await db.reviewCard.update({
      where,
      data: {
        reps,
        interval_days: intervalDays,
        ease: Math.min(MAX_EASE, existing.ease + 0.05),
        due_at: new Date(now.getTime() + intervalDays * DAY_MS),
        last_reviewed_at: now,
      },
    })
  } else {
    await db.reviewCard.update({
      where,
      data: {
        reps: 0,
        lapses: existing.lapses + 1,
        interval_days: 0,
        ease: Math.max(MIN_EASE, existing.ease - 0.2),
        due_at: now,
        last_reviewed_at: now,
      },
    })
  }
}

/**
 * Bootstrap cards for wrong-book entries that predate the SRS feature,
 * so existing users' mistakes enter the review schedule.
 */
export async function ensureCardsForWrongBook(db: Db, userId: string): Promise<void> {
  const wrong = await db.wrongBook.findMany({
    where: { user_id: userId },
    select: { question_id: true },
  })
  if (wrong.length === 0) return

  await db.reviewCard.createMany({
    data: wrong.map((w) => ({ user_id: userId, question_id: w.question_id })),
    skipDuplicates: true,
  })
}
