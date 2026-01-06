/**
 * Focus Queue Page
 * 
 * Phase 4: Daily review queue (no persistence)
 * 
 * Features:
 * - Generate daily review list
 * - Sort by risk_score, wrong_count, and recency
 * - Click to start review
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface QueueItem {
  question_id: number
  wrong_count: number
  last_wrong_at: string
  domain: string
  question_text: string
  risk_score: number
}

interface QueueData {
  success: boolean
  queue: QueueItem[]
  total: number
}

export default function FocusQueuePage() {
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
        <div className={styles.loading}>Generating daily review queue...</div>
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

  const { queue, total } = data

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Daily Review Queue</h1>
        <p className={styles.subtitle}>
          {total === 0
            ? 'No high-risk questions to review'
            : `${total} question${total > 1 ? 's' : ''} ready for review`}
        </p>
      </div>

      {total === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✓</div>
          <p className={styles.emptyText}>Great job! No high-risk questions at the moment.</p>
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
                  Risk: {item.risk_score}
                </div>
                <div className={styles.queueItemBadge}>
                  Wrong {item.wrong_count} time{item.wrong_count > 1 ? 's' : ''}
                </div>
              </div>
              <div className={styles.queueItemText}>{item.question_text}</div>
              <div className={styles.queueItemFooter}>
                <div className={styles.queueItemDate}>
                  Last wrong: {formatDate(item.last_wrong_at)}
                </div>
                <Link
                  href={`/review/${item.question_id}`}
                  className={styles.reviewButton}
                >
                  Review →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <Link href="/review/sprint" className={styles.backButton}>
          ← Back to Sprint Dashboard
        </Link>
      </div>
    </div>
  )
}

