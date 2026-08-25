'use client'

/**
 * Question practice page.
 *
 * Owns question loading (resume / by-index / by-id), answer submission,
 * and navigation. The side panels (tags, notes, chat, explanation) and
 * the option list live in ./components and manage their own state.
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import QuestionOptions from './components/QuestionOptions'
import DoneNavigator, { DoneQuestion } from './components/DoneNavigator'
import TagsPanel from './components/TagsPanel'
import NotesPanel from './components/NotesPanel'
import ChatPanel from './components/ChatPanel'
import ExplanationPanel from './components/ExplanationPanel'

interface Question {
  id: number
  index?: number // Array position in questions.json (0-based)
  domain: string
  question_text: string
  options: Record<string, string>
  correct_answers: string[]
  explanation: string
  explanation_ai_ch?: string | null
}

interface Progress {
  status: 'not_started' | 'correct' | 'wrong'
  selected_answer?: string[]
  wrong_count?: number
}

interface ResumeResponse {
  success: boolean
  question_id?: number
  currentIndex?: number
  question: Question
  progress?: Progress
  totalQuestions?: number
  message?: string
}

export default function QuestionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState<Question | null>(null)
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [totalQuestions, setTotalQuestions] = useState<number>(860)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completionMessage, setCompletionMessage] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [doneQuestions, setDoneQuestions] = useState<DoneQuestion[]>([])

  // Load user context on page load
  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        })
        if (response.status === 401) {
          router.push('/login')
          return
        }
        if (!response.ok) {
          console.error('Failed to load user')
          return
        }
        const data = await response.json()
        if (data.success && data.user) {
          setUser({ id: data.user.id, email: data.user.email })
        }
      } catch (err) {
        console.error('Error loading user:', err)
      }
    }

    loadUser()
  }, [router])

  // Load question and progress on page load
  useEffect(() => {
    const questionIdParam = searchParams.get('questionId')
    const indexParam = searchParams.get('index')

    if (questionIdParam) {
      // Load specific question (from Wrong Book navigation)
      loadSpecificQuestion(parseInt(questionIdParam))
    } else if (indexParam) {
      // Load question by index (from dashboard Continue Learning)
      const index = parseInt(indexParam)
      if (!isNaN(index) && index >= 0) {
        loadQuestionByIndex(index)
      } else {
        loadQuestion()
      }
    } else {
      // Use resume logic (normal flow)
      loadQuestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function loadDoneQuestions() {
    try {
      const response = await fetch('/api/questions?filter=done', {
        method: 'GET',
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      if (data.success && Array.isArray(data.questions)) {
        setDoneQuestions(
          data.questions
            .filter((item: DoneQuestion) => item.status === 'correct' || item.status === 'wrong')
            .map((item: DoneQuestion) => ({ id: item.id, index: item.index, status: item.status }))
        )
      }
    } catch (err) {
      console.error('Error loading done questions:', err)
    }
  }

  function applyQuestionState(nextQuestion: Question, index: number | null, restored: Progress) {
    setQuestion(nextQuestion)
    setCurrentIndex(index)
    setProgress(restored)
    setSelectedAnswers(restored.selected_answer || [])
    setHasSubmitted(restored.status === 'correct' || restored.status === 'wrong')
  }

  // Load question by index (from dashboard / navigation)
  async function loadQuestionByIndex(index: number) {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/questions/by-index?index=${index}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        throw new Error(`Failed to load question: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success || !data.question) {
        throw new Error('Failed to load question')
      }

      if (typeof data.totalQuestions === 'number') {
        setTotalQuestions(data.totalQuestions)
      }
      applyQuestionState(data.question, data.index, data.progress || { status: 'not_started' })
      await loadDoneQuestions()
    } catch (err) {
      console.error('Error loading question by index:', err)
      setError(err instanceof Error ? err.message : 'Failed to load question')
      loadQuestion()
    } finally {
      setLoading(false)
    }
  }

  // Load specific question by ID (from Wrong Book navigation)
  async function loadSpecificQuestion(questionId: number) {
    try {
      setLoading(true)
      setError(null)

      const questionResponse = await fetch(`/api/questions/${questionId}`, {
        method: 'GET',
        credentials: 'include',
      })
      if (!questionResponse.ok) {
        if (questionResponse.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load question')
      }

      const questionData = await questionResponse.json()
      if (!questionData.success || !questionData.question) {
        throw new Error('Question not found')
      }

      const progressResponse = await fetch(`/api/progress?questionId=${questionId}`, {
        method: 'GET',
        credentials: 'include',
      })

      let restored: Progress = { status: 'not_started' }
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        if (progressData.success && progressData.progress) {
          restored = progressData.progress
        }
      }

      const index =
        typeof questionData.question.index === 'number' ? questionData.question.index : null
      applyQuestionState(questionData.question, index, restored)
      await loadDoneQuestions()
    } catch (err) {
      console.error('Error loading specific question:', err)
      setError(err instanceof Error ? err.message : 'Failed to load question')
    } finally {
      setLoading(false)
    }
  }

  // Load question from backend (resume logic)
  async function loadQuestion() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/progress/resume', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      let data: ResumeResponse
      try {
        data = await response.json()
      } catch (jsonErr) {
        throw new Error('Invalid response from server')
      }

      // New user with no progress (or explicit 404): fall back to the first question
      if (response.status === 404 || !data.success) {
        try {
          const firstQuestionResponse = await fetch('/api/questions/first', {
            method: 'GET',
            credentials: 'include',
          })
          if (firstQuestionResponse.status === 401) {
            router.push('/login')
            return
          }
          const firstQuestionData = await firstQuestionResponse.json()
          if (!firstQuestionResponse.ok || !firstQuestionData.success || !firstQuestionData.question) {
            setError(
              firstQuestionData.message ||
                data.message ||
                'No questions available. Please ensure the database is seeded.'
            )
            return
          }

          if (typeof firstQuestionData.totalQuestions === 'number') {
            setTotalQuestions(firstQuestionData.totalQuestions)
          }
          applyQuestionState(
            firstQuestionData.question,
            typeof firstQuestionData.index === 'number' ? firstQuestionData.index : 0,
            firstQuestionData.progress || { status: 'not_started' }
          )
          await loadDoneQuestions()
          return
        } catch (firstQuestionErr) {
          console.error('Error loading first question:', firstQuestionErr)
          setError(data.message || 'No questions available. Please ensure the database is seeded.')
          return
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to load question: ${response.status} ${response.statusText}`)
      }
      if (!data.question) {
        throw new Error('No question found')
      }

      const questionIndex =
        typeof data.currentIndex === 'number'
          ? data.currentIndex
          : data.question.index !== undefined
            ? data.question.index
            : null
      if (typeof data.totalQuestions === 'number') {
        setTotalQuestions(data.totalQuestions)
      }
      applyQuestionState(data.question, questionIndex, data.progress || { status: 'not_started' })
      await loadDoneQuestions()
    } catch (err) {
      console.error('Error loading question:', err)
      setError(err instanceof Error ? err.message : 'Failed to load question')
    } finally {
      setLoading(false)
    }
  }

  // Handle answer selection
  function handleAnswerToggle(optionKey: string) {
    if (progress?.status === 'correct' || progress?.status === 'wrong') {
      return
    }
    setSelectedAnswers((prev) =>
      prev.includes(optionKey) ? prev.filter((key) => key !== optionKey) : [...prev, optionKey]
    )
  }

  async function submitCurrentAnswer() {
    if (!question || selectedAnswers.length === 0) {
      return false
    }

    const response = await fetch('/api/questions/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        questionId: question.id,
        selectedOptions: selectedAnswers,
        currentIndex: currentIndex ?? undefined,
      }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        router.push('/login')
        return false
      }
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || 'Failed to submit answer')
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.message || 'Failed to submit answer')
    }

    if (typeof data.currentIndex === 'number') {
      setCurrentIndex(data.currentIndex)
    }
    setProgress(data.progress)
    setSelectedAnswers(data.progress?.selected_answer || [])
    setHasSubmitted(true)
    await loadDoneQuestions()
    return true
  }

  async function handleSubmit() {
    if (!question || selectedAnswers.length === 0) {
      return
    }
    try {
      setSubmitting(true)
      setError(null)
      await submitCurrentAnswer()
    } catch (err) {
      console.error('Error submitting answer:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const isSubmitted = progress?.status === 'correct' || progress?.status === 'wrong'
  const isCorrect = progress?.status === 'correct'
  const isWrong = progress?.status === 'wrong'
  const hasNextQuestion = currentIndex !== null && currentIndex + 1 < totalQuestions
  const hasPreviousQuestion = currentIndex !== null && currentIndex > 0

  async function submitBeforeNavigation() {
    if (!hasSubmitted && question && selectedAnswers.length > 0) {
      setSubmitting(true)
      setError(null)
      try {
        return await submitCurrentAnswer()
      } catch (err) {
        console.error('Error submitting answer before navigation:', err)
        setError(err instanceof Error ? err.message : 'Failed to submit answer')
        return false
      } finally {
        setSubmitting(false)
      }
    }
    return true
  }

  async function handlePreviousQuestion() {
    if (!hasPreviousQuestion || currentIndex === null) return
    if (!(await submitBeforeNavigation())) return
    await loadQuestionByIndex(currentIndex - 1)
  }

  async function handleQuestionJump(index: number) {
    if (!(await submitBeforeNavigation())) return
    await loadQuestionByIndex(index)
  }

  async function handleNextQuestion() {
    if (currentIndex === null) return
    if (!(await submitBeforeNavigation())) return

    try {
      setLoading(true)
      setError(null)
      setCompletionMessage(null)

      const response = await fetch(`/api/questions/next?currentIndex=${currentIndex}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()
      if (!response.ok || !data.success) {
        if (data.message === 'No more questions') {
          setCompletionMessage('You have completed all questions.')
          return
        }
        throw new Error(data.message || 'Failed to load next question')
      }

      const newIndex = typeof data.index === 'number' ? data.index : currentIndex + 1
      if (typeof data.totalQuestions === 'number') {
        setTotalQuestions(data.totalQuestions)
      }
      applyQuestionState(data.question, newIndex, { status: 'not_started' })
      await loadDoneQuestions()

      // Save the new index so the user can resume from here (non-critical)
      try {
        await fetch('/api/progress/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ currentIndex: newIndex }),
        })
      } catch (updateErr) {
        console.error('Failed to update progress index:', updateErr)
      }
    } catch (err) {
      console.error('Error loading next question:', err)
      setError(err instanceof Error ? err.message : 'Failed to load next question')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading question...</div>
      </div>
    )
  }

  if (error && !question) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={loadQuestion} className={styles.retryButton}>
          Retry
        </button>
      </div>
    )
  }

  if (!question) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>No question found</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.questionCard}>
        {user && (
          <div className={styles.userHeader}>
            <span className={styles.userLabel}>Logged in as:</span>
            <span className={styles.userEmail}>{user.email}</span>
          </div>
        )}

        {currentIndex !== null && (
          <div className={styles.questionNumber}>
            Question {currentIndex + 1} of {totalQuestions}
          </div>
        )}

        <div className={styles.navigationBar}>
          <button
            type="button"
            className={styles.previousButton}
            onClick={handlePreviousQuestion}
            disabled={!hasPreviousQuestion || loading || submitting}
          >
            Previous Question
          </button>
          <button
            type="button"
            className={styles.nextTopButton}
            onClick={handleNextQuestion}
            disabled={!hasNextQuestion || loading || submitting}
          >
            Next Question
          </button>
        </div>

        <DoneNavigator
          doneQuestions={doneQuestions}
          currentIndex={currentIndex}
          onJump={handleQuestionJump}
        />

        <div className={styles.domain}>{question.domain}</div>
        <h1 className={styles.questionText}>{question.question_text}</h1>

        <TagsPanel question={question} />
        <NotesPanel questionId={question.id} />

        <QuestionOptions
          options={question.options}
          correctAnswers={question.correct_answers}
          selectedAnswers={selectedAnswers}
          isSubmitted={isSubmitted}
          onToggle={handleAnswerToggle}
        />

        {!hasSubmitted && (
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={selectedAnswers.length === 0 || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        )}

        {hasSubmitted && (
          <>
            <div className={styles.statusContainer}>
              {isCorrect && (
                <div className={styles.correctStatus}>
                  <span className={styles.statusIcon}>✓</span>
                  <span className={styles.statusText}>Correct!</span>
                </div>
              )}
              {isWrong && (
                <div className={styles.wrongStatus}>
                  <span className={styles.statusIcon}>✗</span>
                  <span className={styles.statusText}>
                    Incorrect
                    {progress?.wrong_count && progress.wrong_count > 1 && (
                      <span className={styles.wrongCount}> (Wrong {progress.wrong_count} times)</span>
                    )}
                  </span>
                </div>
              )}
              <div className={styles.readOnlyNotice}>
                Answer submitted. This question is now read-only.
              </div>
            </div>

            {hasNextQuestion && (
              <button
                type="button"
                className={styles.nextButton}
                onClick={handleNextQuestion}
                disabled={loading || submitting}
              >
                {loading ? 'Loading...' : 'Next Question'}
              </button>
            )}

            {!hasNextQuestion && currentIndex !== null && (
              <div className={styles.completionMessage}>
                🎉 You&apos;ve completed all questions! Great work!
              </div>
            )}
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}
        {completionMessage && <div className={styles.completionMessage}>{completionMessage}</div>}

        <ChatPanel questionId={question.id} />
        <ExplanationPanel
          explanation={question.explanation}
          explanationAiCh={question.explanation_ai_ch}
        />
      </div>
    </div>
  )
}
