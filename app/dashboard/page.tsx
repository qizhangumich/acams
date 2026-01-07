/**
 * Dashboard Page
 * 
 * User account entry point showing progress summary, filters, and question list
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface User {
  id: string
  email: string
}

interface ProgressSummary {
  total: number
  done: number
  correct: number
  wrong: number
  percent: number
}

interface Question {
  id: number
  index: number
  domain: string
  question_text: string
  status: 'correct' | 'wrong' | 'not_started'
}

type Filter = 'all' | 'done' | 'undone' | 'wrong'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [summary, setSummary] = useState<ProgressSummary | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load user and progress summary
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        setError(null)

        // Load user
        const userResponse = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        })

        if (userResponse.status === 401) {
          router.push('/login')
          return
        }

        if (!userResponse.ok) {
          throw new Error('Failed to load user')
        }

        const userData = await userResponse.json()
        if (!userData.success || !userData.user) {
          throw new Error('Invalid user data')
        }

        setUser({
          id: userData.user.id,
          email: userData.user.email,
        })

        // Load progress summary
        await loadProgressSummary()
      } catch (err) {
        console.error('Error loading dashboard:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  // Load progress summary (reusable function)
  async function loadProgressSummary() {
    try {
      const summaryResponse = await fetch('/api/progress/summary', {
        method: 'GET',
        credentials: 'include',
      })

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        if (summaryData.success) {
          setSummary({
            total: summaryData.total,
            done: summaryData.done,
            correct: summaryData.correct,
            wrong: summaryData.wrong,
            percent: summaryData.percent,
          })
        }
      }
    } catch (err) {
      console.error('Error loading progress summary:', err)
    }
  }

  // Load questions when filter changes
  useEffect(() => {
    async function loadQuestions() {
      if (!user) return

      try {
        setLoadingQuestions(true)
        const response = await fetch(`/api/questions?filter=${filter}`, {
          method: 'GET',
          credentials: 'include',
        })

        if (response.status === 401) {
          router.push('/login')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to load questions')
        }

        const data = await response.json()
        if (data.success && Array.isArray(data.questions)) {
          setQuestions(data.questions)
        }
      } catch (err) {
        console.error('Error loading questions:', err)
      } finally {
        setLoadingQuestions(false)
      }
    }

    loadQuestions()
  }, [filter, user, router])

  function handleQuestionClick(questionId: number) {
    router.push(`/questions?questionId=${questionId}`)
  }

  async function handleContinueLearning() {
    try {
      const response = await fetch('/api/progress/resume', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && typeof data.currentIndex === 'number') {
          router.push(`/questions?index=${data.currentIndex}`)
          return
        }
      }

      router.push('/questions')
    } catch (err) {
      console.error('Error checking progress:', err)
      router.push('/questions')
    }
  }

  // Reset learning progress
  async function handleReset() {
    // Show confirmation dialog
    const ok = confirm('This will permanently reset your learning progress. Continue?')
    if (!ok) return

    try {
      const res = await fetch('/api/progress/reset', {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.message || 'Reset failed')
        return
      }

      const data = await res.json()
      if (!data.success) {
        alert('Reset failed')
        return
      }

      // Re-fetch summary to update UI
      await loadProgressSummary()

      // Also reload questions list to reflect reset
      const questionsResponse = await fetch(`/api/questions?filter=${filter}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json()
        if (questionsData.success && Array.isArray(questionsData.questions)) {
          setQuestions(questionsData.questions)
        }
      }
    } catch (err) {
      console.error('Error resetting progress:', err)
      alert('Reset failed. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading dashboard...</div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={() => router.push('/login')} className={styles.button}>
          Go to Login
        </button>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>ACAMS Learning Dashboard</h1>
        
        <div className={styles.userSection}>
          <div className={styles.userLabel}>Logged in as:</div>
          <div className={styles.userEmail}>{user.email}</div>
        </div>

        {summary && (
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <div className={styles.progressStats}>
                <span className={styles.statLabel}>Done:</span>
                <span className={styles.statValue}>{summary.done} / {summary.total}</span>
              </div>
              <div className={styles.progressStats}>
                <span className={styles.statLabel}>Correct:</span>
                <span className={styles.statValueCorrect}>{summary.correct}</span>
              </div>
              <div className={styles.progressStats}>
                <span className={styles.statLabel}>Wrong:</span>
                <span className={styles.statValueWrong}>{summary.wrong}</span>
              </div>
              <div className={styles.progressStats}>
                <span className={styles.statLabel}>Progress:</span>
                <span className={styles.statValue}>{summary.percent}%</span>
              </div>
            </div>
            <div className={styles.progressBarContainer}>
              <div 
                className={styles.progressBar}
                style={{ width: `${summary.percent}%` }}
              />
            </div>
          </div>
        )}

        <div className={styles.filterSection}>
          <button
            className={`${styles.filterButton} ${filter === 'all' ? styles.filterButtonActive : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'done' ? styles.filterButtonActive : ''}`}
            onClick={() => setFilter('done')}
          >
            Done
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'undone' ? styles.filterButtonActive : ''}`}
            onClick={() => setFilter('undone')}
          >
            Undone
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'wrong' ? styles.filterButtonActive : ''}`}
            onClick={() => setFilter('wrong')}
          >
            Wrong
          </button>
        </div>

        <div className={styles.questionsSection}>
          {loadingQuestions ? (
            <div className={styles.loadingQuestions}>Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className={styles.noQuestions}>No questions found</div>
          ) : (
            <div className={styles.questionsList}>
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={styles.questionItem}
                  onClick={() => handleQuestionClick(q.id)}
                >
                  <div className={styles.questionHeader}>
                    <span className={styles.questionNumber}>Q{q.index + 1}</span>
                    <span className={`${styles.statusBadge} ${styles[`statusBadge${q.status.charAt(0).toUpperCase() + q.status.slice(1).replace('_', '')}`]}`}>
                      {q.status === 'not_started' ? 'Not Started' : q.status === 'correct' ? 'Correct' : 'Wrong'}
                    </span>
                  </div>
                  <div className={styles.questionDomain}>{q.domain}</div>
                  <div className={styles.questionText}>{q.question_text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actionButtons}>
          <button
            className={styles.continueButton}
            onClick={handleContinueLearning}
          >
            Continue Learning
          </button>
          
          <button
            className={styles.resetButton}
            onClick={handleReset}
            type="button"
          >
            Reset Learning Progress
          </button>
        </div>
      </div>
    </div>
  )
}
