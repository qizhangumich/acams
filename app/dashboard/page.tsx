/**
 * Dashboard Page
 * 
 * Phase 3D: READ-ONLY decision layer
 * 
 * Features:
 * - Overall stats (total / completed / correct / wrong / not_started)
 * - Domain-level aggregation
 * - CTA buttons (Resume / Wrong Book)
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface DashboardStats {
  total_questions: number
  completed: number
  correct: number
  wrong: number
  not_started: number
}

interface DomainStat {
  domain: string
  correct: number
  wrong: number
  total: number
}

interface DashboardData {
  success: boolean
  stats: DashboardStats
  domain_stats: DomainStat[]
  last_question_id: number | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load dashboard')
      }

      const dashboardData: DashboardData = await response.json()

      if (!dashboardData.success) {
        throw new Error('Failed to load dashboard data')
      }

      setData(dashboardData)
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading dashboard...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Failed to load dashboard'}</div>
        <button onClick={loadDashboard} className={styles.retryButton}>
          Retry
        </button>
      </div>
    )
  }

  const { stats, domain_stats, last_question_id } = data

  // Calculate percentages
  const completionRate = stats.total_questions > 0 
    ? Math.round((stats.completed / stats.total_questions) * 100) 
    : 0
  const accuracyRate = stats.completed > 0
    ? Math.round((stats.correct / stats.completed) * 100)
    : 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Your learning progress overview</p>
      </div>

      {/* Overall Stats */}
      <div className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>Overall Progress</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.total_questions}</div>
            <div className={styles.statLabel}>Total Questions</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.completed}</div>
            <div className={styles.statLabel}>Completed</div>
            <div className={styles.statSubtext}>{completionRate}%</div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardCorrect}`}>
            <div className={styles.statValue}>{stats.correct}</div>
            <div className={styles.statLabel}>Correct</div>
            <div className={styles.statSubtext}>
              {stats.completed > 0 ? `${accuracyRate}% accuracy` : '—'}
            </div>
          </div>
          <div className={`${styles.statCard} ${styles.statCardWrong}`}>
            <div className={styles.statValue}>{stats.wrong}</div>
            <div className={styles.statLabel}>Wrong</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.not_started}</div>
            <div className={styles.statLabel}>Not Started</div>
          </div>
        </div>
      </div>

      {/* Domain Stats */}
      {domain_stats.length > 0 && (
        <div className={styles.domainSection}>
          <h2 className={styles.sectionTitle}>Progress by Domain</h2>
          <div className={styles.domainTable}>
            <div className={styles.domainTableHeader}>
              <div className={styles.domainTableCell}>Domain</div>
              <div className={styles.domainTableCell}>Total</div>
              <div className={styles.domainTableCell}>Correct</div>
              <div className={styles.domainTableCell}>Wrong</div>
              <div className={styles.domainTableCell}>Accuracy</div>
            </div>
            {domain_stats.map((domain) => {
              const domainAccuracy = domain.total > 0
                ? Math.round((domain.correct / domain.total) * 100)
                : 0
              return (
                <div key={domain.domain} className={styles.domainTableRow}>
                  <div className={styles.domainTableCell}>{domain.domain}</div>
                  <div className={styles.domainTableCell}>{domain.total}</div>
                  <div className={`${styles.domainTableCell} ${styles.domainTableCellCorrect}`}>
                    {domain.correct}
                  </div>
                  <div className={`${styles.domainTableCell} ${styles.domainTableCellWrong}`}>
                    {domain.wrong}
                  </div>
                  <div className={styles.domainTableCell}>
                    {domain.total > 0 ? `${domainAccuracy}%` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA Buttons */}
      <div className={styles.ctaSection}>
        <Link href="/questions" className={styles.ctaButton}>
          {last_question_id ? 'Resume Learning' : 'Start Learning'}
        </Link>
        <Link href="/wrong-book" className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}>
          Wrong Book ({stats.wrong})
        </Link>
      </div>
    </div>
  )
}

