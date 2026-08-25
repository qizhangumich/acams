'use client'

/**
 * Exam home: start a new mock exam, resume an active one, and browse
 * past attempts with scores.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface ActiveAttempt {
  id: string
  started_at: string
  duration_min: number
  total_questions: number
  remaining_seconds: number
}

interface PastAttempt {
  id: string
  started_at: string
  submitted_at: string | null
  duration_min: number
  score: number | null
  passed: boolean | null
  total_questions: number
}

const SIZES = [
  { size: 30, label: 'Quick drill', detail: '30 questions · ~53 min' },
  { size: 60, label: 'Half exam', detail: '60 questions · ~105 min' },
  { size: 120, label: 'Full exam', detail: '120 questions · 210 min' },
] as const

export default function ExamHomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<ActiveAttempt | null>(null)
  const [attempts, setAttempts] = useState<PastAttempt[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/exam', { credentials: 'include' })
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load exams')
      }
      const data = await response.json()
      if (!data.success) throw new Error(data.message || 'Failed to load exams')
      setActive(data.active)
      setAttempts(data.attempts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  async function startExam(size: number) {
    try {
      setStarting(true)
      setError(null)
      const response = await fetch('/api/exam/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to start exam')
      }
      router.push(`/exam/${data.attemptId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start exam')
      setStarting(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading exam center...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mock Exam</h1>
        <p className={styles.subtitle}>
          Timed simulation with domain-weighted question sampling. Pass mark: 75%.
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {active ? (
        <div className={styles.activeCard}>
          <div className={styles.activeInfo}>
            <div className={styles.activeTitle}>Exam in progress</div>
            <div className={styles.activeDetail}>
              {active.total_questions} questions · {Math.max(1, Math.round(active.remaining_seconds / 60))}{' '}
              min remaining
            </div>
          </div>
          <button className={styles.resumeButton} onClick={() => router.push(`/exam/${active.id}`)}>
            Resume Exam →
          </button>
        </div>
      ) : (
        <div className={styles.sizeGrid}>
          {SIZES.map(({ size, label, detail }) => (
            <button
              key={size}
              className={styles.sizeCard}
              onClick={() => startExam(size)}
              disabled={starting}
            >
              <div className={styles.sizeLabel}>{label}</div>
              <div className={styles.sizeDetail}>{detail}</div>
              <div className={styles.sizeAction}>{starting ? 'Starting...' : 'Start →'}</div>
            </button>
          ))}
        </div>
      )}

      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>Past attempts</h2>
        {attempts.length === 0 ? (
          <div className={styles.emptyHistory}>No completed exams yet.</div>
        ) : (
          <div className={styles.historyList}>
            {attempts.map((attempt) => (
              <Link key={attempt.id} href={`/exam/${attempt.id}`} className={styles.historyItem}>
                <div className={styles.historyDate}>{formatDate(attempt.started_at)}</div>
                <div className={styles.historyDetail}>{attempt.total_questions} questions</div>
                <div
                  className={`${styles.historyScore} ${
                    attempt.passed ? styles.scorePass : styles.scoreFail
                  }`}
                >
                  {attempt.score != null ? `${attempt.score}%` : '—'}
                  <span className={styles.passLabel}>{attempt.passed ? 'PASS' : 'FAIL'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Link href="/dashboard" className={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
