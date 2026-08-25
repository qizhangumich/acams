'use client'

/**
 * Review queue: spaced-repetition cards that are due now.
 * Start a session to work through them, or open a single question.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface QueueItem {
  question_id: number
  domain: string
  question_text: string
  due_at: string
  reps: number
  lapses: number
  wrong_count: number
}

interface QueueStats {
  due_count: number
  total_cards: number
  next_due_at: string | null
}

interface QueueData {
  success: boolean
  queue: QueueItem[]
  total: number
  stats: QueueStats
}

export default function ReviewQueuePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<QueueData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQueue()
  }, [])

  async function loadQueue() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/review/queue', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load review queue')
      }

      const queueData: QueueData = await response.json()
      if (!queueData.success) {
        throw new Error('Failed to load queue data')
      }

      setData(queueData)
    } catch (err) {
      console.error('Error loading review queue:', err)
      setError(err instanceof Error ? err.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading review queue...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Failed to load queue'}</div>
        <button onClick={loadQueue} className={styles.retryButton}>
          Retry
        </button>
      </div>
    )
  }

  const { queue, stats } = data

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Review Queue</h1>
        <p className={styles.subtitle}>
          Spaced repetition over every question you have missed — cards come back right before you
          would forget them.
        </p>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.due_count}</div>
          <div className={styles.statLabel}>due now</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.total_cards}</div>
          <div className={styles.statLabel}>cards in rotation</div>
        </div>
        {stats.due_count > 0 && (
          <Link href="/review/session" className={styles.startButton}>
            Start Review Session →
          </Link>
        )}
      </div>

      {queue.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✓</div>
          <p className={styles.emptyText}>
            Nothing due right now.
            {stats.next_due_at && ` Next card due ${formatDate(stats.next_due_at)}.`}
          </p>
          <Link href="/review/sprint" className={styles.backButton}>
            Back to Sprint Dashboard
          </Link>
        </div>
      ) : (
        <div className={styles.queueList}>
          {queue.map((item, index) => (
            <div key={item.question_id} className={styles.queueItem}>
              <div className={styles.queueItemHeader}>
                <div className={styles.queueItemNumber}>#{index + 1}</div>
                <div className={styles.queueItemDomain}>{item.domain}</div>
                <div className={styles.queueItemBadge}>
                  Missed {item.wrong_count} time{item.wrong_count > 1 ? 's' : ''}
                </div>
                {item.reps > 0 && (
                  <div className={styles.queueItemBadgeGood}>
                    {item.reps} correct streak
                  </div>
                )}
              </div>
              <div className={styles.queueItemText}>{item.question_text}</div>
              <div className={styles.queueItemFooter}>
                <div className={styles.queueItemDate}>Due since {formatDate(item.due_at)}</div>
                <Link href={`/review/${item.question_id}`} className={styles.reviewButton}>
                  Open →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <Link href="/review/sprint" className={styles.backButton}>
          ← Sprint Dashboard
        </Link>
        <Link href="/dashboard" className={styles.backButton}>
          Dashboard
        </Link>
      </div>
    </div>
  )
}
