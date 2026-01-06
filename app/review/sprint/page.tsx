/**
 * Sprint Dashboard Page
 * 
 * Phase 4: Exam Sprint Review Mode (READ-ONLY)
 * 
 * Features:
 * - High-risk summary
 * - Domain risk aggregation
 * - CTA to start review
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface SprintSummary {
  total_high_risk: number
  recent_mistakes: number
  total_wrong: number
}

interface DomainRisk {
  domain: string
  high_risk_count: number
  total_wrong: number
}

interface SprintDashboardData {
  success: boolean
  summary: SprintSummary
  domain_risk: DomainRisk[]
  high_risk_questions: Array<{
    question_id: number
    wrong_count: number
    domain: string
    risk_score: number
  }>
}

export default function SprintDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SprintDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/review/sprint-dashboard', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load sprint dashboard')
      }

      const dashboardData: SprintDashboardData = await response.json()

      if (!dashboardData.success) {
        throw new Error('Failed to load dashboard data')
      }

      setData(dashboardData)
    } catch (err) {
      console.error('Error loading sprint dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading sprint dashboard...</div>
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

  const { summary, domain_risk } = data

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Exam Sprint Review</h1>
        <p className={styles.subtitle}>Focus on high-risk questions before your exam</p>
      </div>

      {/* High-Risk Summary */}
      <div className={styles.summarySection}>
        <h2 className={styles.sectionTitle}>High-Risk Summary</h2>
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardHighRisk}`}>
            <div className={styles.summaryValue}>{summary.total_high_risk}</div>
            <div className={styles.summaryLabel}>High-Risk Questions</div>
            <div className={styles.summarySubtext}>
              Need immediate review
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{summary.recent_mistakes}</div>
            <div className={styles.summaryLabel}>Recent Mistakes</div>
            <div className={styles.summarySubtext}>Last 7 days</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryValue}>{summary.total_wrong}</div>
            <div className={styles.summaryLabel}>Total Wrong</div>
            <div className={styles.summarySubtext}>All time</div>
          </div>
        </div>
      </div>

      {/* Domain Risk Aggregation */}
      {domain_risk.length > 0 && (
        <div className={styles.domainSection}>
          <h2 className={styles.sectionTitle}>Domain Risk Analysis</h2>
          <div className={styles.domainTable}>
            <div className={styles.domainTableHeader}>
              <div className={styles.domainTableCell}>Domain</div>
              <div className={styles.domainTableCell}>High-Risk</div>
              <div className={styles.domainTableCell}>Total Wrong</div>
              <div className={styles.domainTableCell}>Risk Ratio</div>
            </div>
            {domain_risk.map((domain) => {
              const riskRatio =
                domain.total_wrong > 0
                  ? Math.round((domain.high_risk_count / domain.total_wrong) * 100)
                  : 0
              return (
                <div key={domain.domain} className={styles.domainTableRow}>
                  <div className={styles.domainTableCell}>{domain.domain}</div>
                  <div className={`${styles.domainTableCell} ${styles.domainTableCellHighRisk}`}>
                    {domain.high_risk_count}
                  </div>
                  <div className={styles.domainTableCell}>{domain.total_wrong}</div>
                  <div className={styles.domainTableCell}>
                    {riskRatio}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className={styles.ctaSection}>
        {summary.total_high_risk > 0 ? (
          <Link href="/review/queue" className={styles.ctaButton}>
            Start Review ({summary.total_high_risk} questions)
          </Link>
        ) : (
          <div className={styles.noHighRisk}>
            <div className={styles.noHighRiskIcon}>✓</div>
            <p className={styles.noHighRiskText}>
              Great job! No high-risk questions at the moment.
            </p>
            <Link href="/dashboard" className={styles.backButton}>
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

