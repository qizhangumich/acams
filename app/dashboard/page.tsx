/**
 * Dashboard Page
 * 
 * User account entry point showing identity and progress summary
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
  currentQuestion: number | null
  totalQuestions: number
  hasProgress: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [progress, setProgress] = useState<ProgressSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          // Not authenticated, redirect to login
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

        // Try to load progress summary
        try {
          const progressResponse = await fetch('/api/progress/resume', {
            method: 'GET',
            credentials: 'include',
          })

          if (progressResponse.ok) {
            const progressData = await progressResponse.json()
            if (progressData.success && progressData.question) {
              // User has progress
              setProgress({
                currentQuestion: progressData.question_id || null,
                totalQuestions: 860, // Default, could be fetched from API
                hasProgress: true,
              })
            } else {
              // New user, no progress yet
              setProgress({
                currentQuestion: null,
                totalQuestions: 860,
                hasProgress: false,
              })
            }
          } else {
            // No progress yet
            setProgress({
              currentQuestion: null,
              totalQuestions: 860,
              hasProgress: false,
            })
          }
        } catch (progressErr) {
          // Progress loading failed, but not critical
          setProgress({
            currentQuestion: null,
            totalQuestions: 860,
            hasProgress: false,
          })
        }
      } catch (err) {
        console.error('Error loading dashboard:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  async function handleContinueLearning() {
    try {
      // Check for saved progress
      const response = await fetch('/api/progress/resume', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && typeof data.currentIndex === 'number') {
          // User has progress, navigate with index
          router.push(`/questions?index=${data.currentIndex}`)
          return
        }
      }

      // No progress, start from beginning
      router.push('/questions')
    } catch (err) {
      console.error('Error checking progress:', err)
      // On error, just go to questions page
      router.push('/questions')
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
    return null // Will redirect
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome to ACAMS Learning</h1>
        
        <div className={styles.userSection}>
          <div className={styles.userLabel}>Logged in as:</div>
          <div className={styles.userEmail}>{user.email}</div>
        </div>

        {progress && (
          <div className={styles.progressSection}>
            {progress.hasProgress && progress.currentQuestion ? (
              <div className={styles.progressText}>
                Your progress: Question {progress.currentQuestion} of {progress.totalQuestions}
              </div>
            ) : (
              <div className={styles.progressText}>
                Ready to start learning! {progress.totalQuestions} questions available.
              </div>
            )}
          </div>
        )}

        <button
          className={styles.continueButton}
          onClick={handleContinueLearning}
        >
          Continue Learning
        </button>
      </div>
    </div>
  )
}
