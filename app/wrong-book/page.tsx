/**
 * Wrong Book Page
 * 
 * Phase 3D: READ-ONLY decision layer
 * 
 * Features:
 * - List wrong questions
 * - Show wrong_count and domain
 * - Click to reopen Question Page with full context
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface WrongQuestion {
  question_id: number
  question_index: number
  wrong_count: number
  last_wrong_at: string
  retested_at: string | null
  domain: string
  question_text: string
  tags: string[]
  has_note: boolean
  note_updated_at: string | null
}

interface WrongBookData {
  success: boolean
  questions: WrongQuestion[]
  total: number
  stats: { total: number; retested: number; pending: number }
}

export default function WrongBookPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<WrongBookData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadWrongBook()
  }, [])

  async function loadWrongBook() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/wrong-book', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load wrong book')
      }

      const wrongBookData: WrongBookData = await response.json()

      if (!wrongBookData.success) {
        throw new Error('Failed to load wrong book data')
      }

      setData(wrongBookData)
    } catch (err) {
      console.error('Error loading wrong book:', err)
      setError(err instanceof Error ? err.message : 'Failed to load wrong book')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading wrong book...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Failed to load wrong book'}</div>
        <button onClick={loadWrongBook} className={styles.retryButton}>
          Retry
        </button>
      </div>
    )
  }

  const { questions, total, stats } = data

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Wrong Book</h1>
        <p className={styles.subtitle}>
          {total === 0
            ? 'No wrong answers yet. Keep practicing!'
            : `${stats.pending} of ${stats.total} still to retest — pending questions first, in question order`}
        </p>
        <div className={styles.headerActions}>
          {stats.pending > 0 && (
            <Link href="/review/session?mode=wrongbook" className={styles.headerButtonPrimary}>
              ▶ Retest {stats.pending} Pending in Order
            </Link>
          )}
          <Link href="/review/sprint" className={styles.headerButton}>
            Sprint Review
          </Link>
          <Link href="/review/queue" className={styles.headerButton}>
            Daily Queue
          </Link>
        </div>
      </div>

      {total === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✓</div>
          <p className={styles.emptyText}>Great job! No wrong answers yet.</p>
          <Link href="/questions" className={styles.emptyButton}>
            Continue Learning
          </Link>
        </div>
      ) : (
        <div className={styles.questionsList}>
          {questions.map((question) => (
            <Link
              key={question.question_id}
              href={`/questions?questionId=${question.question_id}`}
              className={`${styles.questionCard} ${question.retested_at ? styles.questionCardDone : ''}`}
            >
              <div className={styles.questionHeader}>
                <div className={styles.questionNumber}>Q{question.question_index + 1}</div>
                <div className={styles.questionDomain}>{question.domain}</div>
                {question.retested_at ? (
                  <div className={styles.retestedBadge}>✓ Retested</div>
                ) : (
                  <div className={styles.pendingBadge}>Pending</div>
                )}
                <div className={styles.questionBadge}>
                  Wrong {question.wrong_count} time{question.wrong_count > 1 ? 's' : ''}
                </div>
              </div>
              <div className={styles.questionText}>{question.question_text}</div>
              {(question.tags.length > 0 || question.has_note) && (
                <div className={styles.studyMeta}>
                  {question.tags.map((tag) => (
                    <span key={tag} className={styles.tagChip}>{tag}</span>
                  ))}
                  {question.has_note && (
                    <span className={styles.noteBadge}>
                      Note saved
                      {question.note_updated_at && ` ${formatDate(question.note_updated_at)}`}
                    </span>
                  )}
                </div>
              )}
              <div className={styles.questionFooter}>
                <div className={styles.questionDate}>
                  Last wrong: {formatDate(question.last_wrong_at)}
                </div>
                <div className={styles.questionLink}>View Question →</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <Link href="/dashboard" className={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

