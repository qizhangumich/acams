'use client'

/**
 * Exam runner + report.
 *
 * While the attempt is in progress: countdown timer, one question at a
 * time, a navigation grid, and answers saved to the server as they are
 * selected. Auto-submits when the clock reaches zero.
 *
 * After submission the same route renders the scored report: overall
 * score vs. the 75% pass mark, per-domain breakdown, and a full review
 * of every question with the correct answers and explanations.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import OptionList from '@/app/components/OptionList'
import styles from './page.module.css'

interface ExamQuestion {
  id: number
  domain: string
  question_text: string
  options: Record<string, string>
  correct_answers?: string[]
  explanation?: string
  explanation_ai_en?: string | null
  explanation_ai_ch?: string | null
}

interface QuestionResult {
  question_id: number
  domain: string
  selected: string[]
  correct_answers: string[]
  is_correct: boolean
}

interface ExamReport {
  score: number
  passed: boolean
  correct_count: number
  total: number
  domain_stats: Record<string, { correct: number; total: number }>
  results: QuestionResult[]
}

interface AttemptData {
  id: string
  status: 'in_progress' | 'submitted'
  duration_min: number
  total_questions: number
  questions: ExamQuestion[]
  answers: Record<string, string[]>
  remaining_seconds?: number
  report?: ExamReport
}

export default function ExamAttemptPage() {
  const router = useRouter()
  const params = useParams<{ attemptId: string }>()
  const attemptId = params.attemptId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<AttemptData | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const submittingRef = useRef(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/exam/${attemptId}`, { credentials: 'include' })
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load exam')
      }
      const data = await response.json()
      if (!data.success) throw new Error(data.message || 'Failed to load exam')
      setAttempt(data.attempt)
      setAnswers(data.attempt.answers || {})
      if (data.attempt.status === 'in_progress') {
        setSecondsLeft(data.attempt.remaining_seconds ?? 0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam')
    } finally {
      setLoading(false)
    }
  }, [attemptId, router])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setConfirmOpen(false)
    try {
      const response = await fetch(`/api/exam/${attemptId}/submit`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit exam')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit exam')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [attemptId, load])

  // Countdown timer; auto-submit at zero.
  useEffect(() => {
    if (attempt?.status !== 'in_progress' || secondsLeft === null) return
    if (secondsLeft <= 0) {
      handleSubmit()
      return
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, attempt?.status, handleSubmit])

  function toggleOption(questionId: number, key: string) {
    const id = String(questionId)
    setAnswers((prev) => {
      const current = prev[id] ?? []
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key].sort()
      const updated = { ...prev, [id]: next }
      if (next.length === 0) delete updated[id]

      // Persist in the background; failures are non-fatal (answers re-save on
      // the next toggle, and submit scores whatever the server last stored).
      fetch(`/api/exam/${attemptId}/answer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selected: next }),
      }).catch(() => {})

      return updated
    })
  }

  function formatClock(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const mm = String(m).padStart(2, '0')
    const ss = String(s).padStart(2, '0')
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading exam...</div>
      </div>
    )
  }

  if (error || !attempt) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Exam not found'}</div>
        <Link href="/exam" className={styles.backButton}>
          ← Back to Exam Center
        </Link>
      </div>
    )
  }

  // ---------- Report view ----------
  if (attempt.status === 'submitted' && attempt.report) {
    const report = attempt.report
    const questionById = new Map(attempt.questions.map((q) => [q.id, q]))

    return (
      <div className={styles.container}>
        <div className={`${styles.scoreCard} ${report.passed ? styles.scoreCardPass : styles.scoreCardFail}`}>
          <div className={styles.scoreValue}>{report.score}%</div>
          <div className={styles.scoreVerdict}>{report.passed ? 'PASS' : 'FAIL'}</div>
          <div className={styles.scoreDetail}>
            {report.correct_count} / {report.total} correct · pass mark 75%
          </div>
        </div>

        <div className={styles.domainSection}>
          <h2 className={styles.sectionTitle}>By domain</h2>
          {Object.entries(report.domain_stats).map(([domain, stats]) => {
            const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
            return (
              <div key={domain} className={styles.domainRow}>
                <div className={styles.domainName}>{domain}</div>
                <div className={styles.domainBarTrack}>
                  <div
                    className={`${styles.domainBar} ${pct >= 75 ? styles.domainBarGood : styles.domainBarBad}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className={styles.domainPct}>
                  {stats.correct}/{stats.total} ({pct}%)
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.reviewSection}>
          <h2 className={styles.sectionTitle}>Question review</h2>
          {report.results.map((result, index) => {
            const question = questionById.get(result.question_id)
            if (!question) return null
            return (
              <div
                key={result.question_id}
                className={`${styles.reviewItem} ${result.is_correct ? styles.reviewCorrect : styles.reviewWrong}`}
              >
                <div className={styles.reviewHeader}>
                  <span className={styles.reviewNumber}>Q{index + 1}</span>
                  <span className={styles.reviewDomain}>{result.domain}</span>
                  <span className={result.is_correct ? styles.badgeCorrect : styles.badgeWrong}>
                    {result.is_correct ? 'Correct' : result.selected.length === 0 ? 'Unanswered' : 'Wrong'}
                  </span>
                </div>
                <div className={styles.reviewQuestion}>{question.question_text}</div>
                <OptionList
                  options={question.options}
                  selected={result.selected}
                  onToggle={() => {}}
                  disabled
                  reveal={{ correct: result.correct_answers }}
                />
                {!result.is_correct && question.explanation && (
                  <div className={styles.explanation}>
                    <div className={styles.explanationTitle}>Explanation</div>
                    <div className={styles.explanationText}>
                      {question.explanation_ai_en || question.explanation}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className={styles.footer}>
          <Link href="/exam" className={styles.backButton}>
            ← Back to Exam Center
          </Link>
          <Link href="/review/queue" className={styles.reviewQueueLink}>
            Review misses in the queue →
          </Link>
        </div>
      </div>
    )
  }

  // ---------- Runner view ----------
  const question = attempt.questions[currentIndex]
  const selected = question ? answers[String(question.id)] ?? [] : []
  const answeredCount = Object.keys(answers).length
  const lowTime = secondsLeft !== null && secondsLeft < 300

  return (
    <div className={styles.container}>
      <div className={styles.runnerHeader}>
        <div className={styles.progressLabel}>
          Question {currentIndex + 1} / {attempt.total_questions}
          <span className={styles.answeredLabel}> · {answeredCount} answered</span>
        </div>
        <div className={`${styles.clock} ${lowTime ? styles.clockLow : ''}`}>
          {secondsLeft !== null ? formatClock(secondsLeft) : '--:--'}
        </div>
        <button className={styles.submitButton} onClick={() => setConfirmOpen(true)} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      </div>

      {question && (
        <div className={styles.questionCard}>
          <div className={styles.questionDomain}>{question.domain}</div>
          <div className={styles.questionText}>{question.question_text}</div>
          <OptionList
            options={question.options}
            selected={selected}
            onToggle={(key) => toggleOption(question.id, key)}
          />
        </div>
      )}

      <div className={styles.navButtons}>
        <button
          className={styles.navButton}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          ← Previous
        </button>
        <button
          className={styles.navButton}
          onClick={() => setCurrentIndex((i) => Math.min(attempt.total_questions - 1, i + 1))}
          disabled={currentIndex >= attempt.total_questions - 1}
        >
          Next →
        </button>
      </div>

      <div className={styles.navGrid}>
        {attempt.questions.map((q, index) => {
          const isAnswered = (answers[String(q.id)] ?? []).length > 0
          const classNames = [styles.navCell]
          if (index === currentIndex) classNames.push(styles.navCellCurrent)
          else if (isAnswered) classNames.push(styles.navCellAnswered)
          return (
            <button key={q.id} className={classNames.join(' ')} onClick={() => setCurrentIndex(index)}>
              {index + 1}
            </button>
          )
        })}
      </div>

      {confirmOpen && (
        <div className={styles.modalOverlay} onClick={() => setConfirmOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Submit exam?</div>
            <div className={styles.modalText}>
              {answeredCount} of {attempt.total_questions} questions answered.
              {answeredCount < attempt.total_questions &&
                ` Unanswered questions will be marked wrong.`}
            </div>
            <div className={styles.modalButtons}>
              <button className={styles.modalCancel} onClick={() => setConfirmOpen(false)}>
                Keep working
              </button>
              <button className={styles.modalConfirm} onClick={handleSubmit} disabled={submitting}>
                Submit now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
