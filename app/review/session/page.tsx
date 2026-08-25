'use client'

/**
 * Review session: steps through every due spaced-repetition card,
 * asks the question, grades the answer server-side, shows the
 * explanation, and reschedules the card (correct -> longer interval,
 * wrong -> due again now).
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import OptionList from '@/app/components/OptionList'
import styles from './page.module.css'

interface QueueItem {
  question_id: number
  domain: string
}

interface QuestionDetail {
  id: number
  domain: string
  question_text: string
  options: Record<string, string>
  correct_answers: string[]
  explanation: string
  explanation_ai_en: string | null
  explanation_ai_ch: string | null
}

interface AnswerResult {
  correct: boolean
  correct_answers: string[]
  next_due_at: string | null
  interval_days: number | null
}

export default function ReviewSessionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [position, setPosition] = useState(0)
  const [question, setQuestion] = useState<QuestionDetail | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [showChinese, setShowChinese] = useState(false)

  useEffect(() => {
    loadQueue()
  }, [])

  async function loadQueue() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/review/queue', { credentials: 'include' })
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load review queue')
      }
      const data = await response.json()
      if (!data.success) throw new Error(data.message || 'Failed to load queue')
      setQueue(data.queue)
      if (data.queue.length > 0) {
        await loadQuestion(data.queue[0].question_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }

  async function loadQuestion(questionId: number) {
    const response = await fetch(`/api/questions/${questionId}`, { credentials: 'include' })
    if (!response.ok) throw new Error('Failed to load question')
    const data = await response.json()
    if (!data.success) throw new Error(data.message || 'Failed to load question')
    setQuestion(data.question)
    setSelected([])
    setResult(null)
    setShowChinese(false)
  }

  async function submitAnswer() {
    if (!question || selected.length === 0 || submitting) return
    try {
      setSubmitting(true)
      const response = await fetch('/api/review/answer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, selected }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit answer')
      }
      setResult(data)
      if (data.correct) setCorrectCount((c) => c + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  async function goNext() {
    const next = position + 1
    setPosition(next)
    if (next < queue.length) {
      try {
        await loadQuestion(queue[next].question_id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load question')
      }
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Preparing review session...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <Link href="/review/queue" className={styles.backButton}>
          ← Back to Review Queue
        </Link>
      </div>
    )
  }

  // Nothing due
  if (queue.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.doneCard}>
          <div className={styles.doneIcon}>✓</div>
          <div className={styles.doneTitle}>Nothing due for review</div>
          <div className={styles.doneText}>Come back when the next cards fall due.</div>
          <Link href="/review/queue" className={styles.backButton}>
            ← Back to Review Queue
          </Link>
        </div>
      </div>
    )
  }

  // Session finished
  if (position >= queue.length) {
    const pct = Math.round((correctCount / queue.length) * 100)
    return (
      <div className={styles.container}>
        <div className={styles.doneCard}>
          <div className={styles.doneIcon}>🎉</div>
          <div className={styles.doneTitle}>Session complete</div>
          <div className={styles.doneText}>
            {correctCount} / {queue.length} correct ({pct}%). Missed questions are due again now —
            run another session to clear them.
          </div>
          <div className={styles.doneButtons}>
            <button className={styles.primaryButton} onClick={() => window.location.reload()}>
              Review again
            </button>
            <Link href="/dashboard" className={styles.backButton}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const explanationEn = question?.explanation_ai_en || question?.explanation
  const explanationCh = question?.explanation_ai_ch

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.progressLabel}>
          Card {position + 1} / {queue.length}
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${(position / queue.length) * 100}%` }} />
        </div>
        <Link href="/review/queue" className={styles.exitLink}>
          Exit
        </Link>
      </div>

      {question && (
        <div className={styles.questionCard}>
          <div className={styles.questionDomain}>{question.domain}</div>
          <div className={styles.questionText}>{question.question_text}</div>
          <OptionList
            options={question.options}
            selected={selected}
            onToggle={(key) =>
              !result &&
              setSelected((prev) =>
                prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort()
              )
            }
            disabled={!!result}
            reveal={result ? { correct: result.correct_answers } : null}
          />

          {!result ? (
            <button
              className={styles.primaryButton}
              onClick={submitAnswer}
              disabled={selected.length === 0 || submitting}
            >
              {submitting ? 'Checking...' : 'Check Answer'}
            </button>
          ) : (
            <>
              <div className={result.correct ? styles.resultCorrect : styles.resultWrong}>
                {result.correct
                  ? `Correct! Next review in ${
                      result.interval_days && result.interval_days >= 1
                        ? `${Math.round(result.interval_days)} day${Math.round(result.interval_days) > 1 ? 's' : ''}`
                        : 'this session'
                    }.`
                  : 'Wrong — this card stays due until you get it right.'}
              </div>

              {explanationEn && (
                <div className={styles.explanation}>
                  <div className={styles.explanationHeader}>
                    <span className={styles.explanationTitle}>Explanation</span>
                    {explanationCh && (
                      <button className={styles.langToggle} onClick={() => setShowChinese((v) => !v)}>
                        {showChinese ? 'EN' : '中文'}
                      </button>
                    )}
                  </div>
                  <div className={styles.explanationText}>
                    {showChinese && explanationCh ? explanationCh : explanationEn}
                  </div>
                </div>
              )}

              <button className={styles.primaryButton} onClick={goNext}>
                {position + 1 < queue.length ? 'Next Card →' : 'Finish Session'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
