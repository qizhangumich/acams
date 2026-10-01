'use client'

/**
 * Special Group: the user's hand-picked question collection (tagged
 * SPECIAL — originally aggregated from study screenshots). Lists the
 * group in question order and runs a sequential review session over it.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../wrong-book/page.module.css'

interface SpecialItem {
  question_id: number
  domain: string
  question_text: string
}

export default function SpecialGroupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<SpecialItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/review/queue?mode=special', { credentials: 'include' })
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load special group')
      }
      const data = await response.json()
      if (!data.success) throw new Error(data.message || 'Failed to load special group')
      setItems(data.queue)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load special group')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading special group...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={load} className={styles.retryButton}>Retry</button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>⭐ Special Group</h1>
        <p className={styles.subtitle}>
          {items.length === 0
            ? 'No questions in the group yet — tag a question "SPECIAL" on the practice page to add it.'
            : `${items.length} hand-picked questions, in question order. Add or remove via the SPECIAL tag on any question.`}
        </p>
        <div className={styles.headerActions}>
          {items.length > 0 && (
            <Link href="/review/session?mode=special" className={styles.headerButtonPrimary}>
              ▶ Review All {items.length} in Order
            </Link>
          )}
          <Link href="/wrong-book" className={styles.headerButton}>
            Wrong Book
          </Link>
        </div>
      </div>

      <div className={styles.questionsList}>
        {items.map((item, i) => (
          <Link
            key={item.question_id}
            href={`/questions?questionId=${item.question_id}`}
            className={styles.questionCard}
          >
            <div className={styles.questionHeader}>
              <div className={styles.questionNumber}>Q{item.question_id}</div>
              <div className={styles.questionDomain}>{item.domain}</div>
            </div>
            <div className={styles.questionText}>{item.question_text}</div>
            <div className={styles.questionFooter}>
              <div className={styles.questionDate}>#{i + 1} of {items.length}</div>
              <div className={styles.questionLink}>View Question →</div>
            </div>
          </Link>
        ))}
      </div>

      <div className={styles.footer}>
        <Link href="/dashboard" className={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
