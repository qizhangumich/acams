/**
 * Question Page
 * 
 * Phase 3A: Question display and answer submission ONLY
 * 
 * Features:
 * - Load question from backend on page load
 * - Display question and options
 * - Allow answer selection
 * - Submit answer to backend
 * - Display correct/incorrect status from backend
 * - Show read-only state after submission
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './page.module.css'

interface Question {
  id: number
  index?: number // Array position in questions.json (0-based), optional for backwards compatibility
  domain: string
  question_text: string
  options: Record<string, string>
  correct_answers: string[]
  explanation: string
  explanation_ai_en?: string | null
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
  // Optional error/message field returned when success is false
  message?: string
}

interface ProgressResponse {
  success: boolean
  progress: {
    status: 'correct' | 'wrong'
    selected_answer: string[]
    wrong_count?: number
  }
}

export default function QuestionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState<Question | null>(null)
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [totalQuestions, setTotalQuestions] = useState<number>(860) // Default to known total
  const [progress, setProgress] = useState<Progress | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completionMessage, setCompletionMessage] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  
  // Explanation panel state (UI-only, not persisted)
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'official' | 'ai_en' | 'ai_ch'>('official')
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    created_at: string
  }>>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Load user context on page load
  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        })

        if (response.status === 401) {
          // Not authenticated, redirect to login
          router.push('/login')
          return
        }

        if (!response.ok) {
          console.error('Failed to load user')
          return
        }

        const data = await response.json()
        if (data.success && data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
          })
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
  }, [searchParams])

  // Load chat history when question changes
  useEffect(() => {
    if (question?.id) {
      loadChatHistory(question.id)
    } else {
      // Reset chat when question is cleared
      setChatMessages([])
    }
  }, [question?.id])

  // Load question by index (from dashboard)
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

      setQuestion(data.question)
      setCurrentIndex(data.index)
      if (typeof data.totalQuestions === 'number') {
        setTotalQuestions(data.totalQuestions)
      }
      setProgress({ status: 'not_started' })
      setSelectedAnswers([])
      setHasSubmitted(false)
    } catch (err) {
      console.error('Error loading question by index:', err)
      setError(err instanceof Error ? err.message : 'Failed to load question')
      // Fallback to normal load
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

      // First, get the question
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

      // Then, get progress for this question
      const progressResponse = await fetch(`/api/progress?questionId=${questionId}`, {
        method: 'GET',
        credentials: 'include',
      })

      let progress: Progress | null = null
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        if (progressData.success && progressData.progress) {
          progress = progressData.progress
        }
      }

      setQuestion(questionData.question)
      setProgress(progress || { status: 'not_started' })

      // If progress exists and has selected_answer, restore it
      if (progress?.selected_answer) {
        setSelectedAnswers(progress.selected_answer)
      } else {
        setSelectedAnswers([])
      }

      // Load chat history for this question
      if (questionData.question.id) {
        loadChatHistory(questionData.question.id)
      }
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
        // User not authenticated, redirect to login
        router.push('/login')
        return
      }

      // Parse response JSON
      let data: ResumeResponse
      try {
        data = await response.json()
      } catch (jsonErr) {
        throw new Error('Invalid response from server')
      }

      // Check if success is false (new user with no progress)
      // or if the API explicitly returns 404 (no questions / no progress)
      if (response.status === 404 || !data.success) {
        // Try to load the first question from database for new users
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
            // No questions in database or failed to load first question
            setError(firstQuestionData.message || data.message || 'No questions available. Please ensure the database is seeded.')
            return
          }

          // Successfully loaded first question for new user
          setQuestion(firstQuestionData.question)
          setCurrentIndex(typeof firstQuestionData.index === 'number' ? firstQuestionData.index : 0)
          if (typeof firstQuestionData.totalQuestions === 'number') {
            setTotalQuestions(firstQuestionData.totalQuestions)
          }
          setProgress({ status: 'not_started' })
          setSelectedAnswers([])
          setHasSubmitted(false) // Reset submission state
          return
        } catch (firstQuestionErr) {
          console.error('Error loading first question:', firstQuestionErr)
          setError(data.message || 'No questions available. Please ensure the database is seeded.')
          return
        }
      }

      // For other non-OK statuses, surface as an error
      if (!response.ok) {
        throw new Error(`Failed to load question: ${response.status} ${response.statusText}`)
      }

      // Success case: user has progress
      if (!data.question) {
        throw new Error('No question found')
      }

      setQuestion(data.question)
      // Use index from API response if available, otherwise try to get from question object
      const questionIndex = typeof data.currentIndex === 'number' 
        ? data.currentIndex 
        : (data.question.index !== undefined ? data.question.index : null)
      setCurrentIndex(questionIndex)
      
      // Use totalQuestions from API response if available
      if (typeof data.totalQuestions === 'number') {
        setTotalQuestions(data.totalQuestions)
      }
      
      setProgress(data.progress || { status: 'not_started' })

      // If progress exists and has selected_answer, restore it
      if (data.progress?.selected_answer) {
        setSelectedAnswers(data.progress.selected_answer)
        // If progress exists, mark as submitted
        if (data.progress.status === 'correct' || data.progress.status === 'wrong') {
          setHasSubmitted(true)
        }
      } else {
        setSelectedAnswers([])
        setHasSubmitted(false)
      }
    } catch (err) {
      console.error('Error loading question:', err)
      setError(err instanceof Error ? err.message : 'Failed to load question')
    } finally {
      setLoading(false)
    }
  }

  // Handle answer selection
  function handleAnswerToggle(optionKey: string) {
    // If already submitted, don't allow changes
    if (progress?.status === 'correct' || progress?.status === 'wrong') {
      return
    }

    // Toggle selection
    if (selectedAnswers.includes(optionKey)) {
      setSelectedAnswers(selectedAnswers.filter((key) => key !== optionKey))
    } else {
      setSelectedAnswers([...selectedAnswers, optionKey])
    }
  }

  // Submit answer to backend
  // HARD, UNAVOIDABLE answer submission
  async function handleSubmit() {
    if (!question || selectedAnswers.length === 0) {
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Call POST /api/answer (MANDATORY)
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId: question.id,
          selectedAnswers: selectedAnswers,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to submit answer')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to submit answer')
      }

      // Update progress with backend response
      setProgress({
        status: data.status,
        selected_answer: data.selectedAnswers,
      })
      
      // Mark as submitted to show "Next Question" button
      setHasSubmitted(true)
    } catch (err) {
      console.error('Error submitting answer:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
      // DO NOT mark as submitted if API call fails
    } finally {
      setSubmitting(false)
    }
  }

  // Load chat history for current question
  async function loadChatHistory(questionId: number) {
    try {
      const response = await fetch(`/api/chat/${questionId}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load chat history')
      }

      const data = await response.json()

      if (data.success && data.messages) {
        setChatMessages(data.messages)
      } else {
        setChatMessages([])
      }
    } catch (err) {
      console.error('Error loading chat history:', err)
      setChatMessages([])
    }
  }

  // Send chat message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!question || !chatInput.trim() || chatLoading) {
      return
    }

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    // Optimistically add user message
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      role: 'user' as const,
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setChatMessages((prev) => [...prev, tempUserMessage])

    try {
      const response = await fetch(`/api/chat/${question.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      if (data.success) {
        // Reload chat history to get both messages from backend
        await loadChatHistory(question.id)
      } else {
        throw new Error(data.message || 'Failed to get AI response')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      // Remove optimistic message on error
      setChatMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id))
      setChatInput(userMessage) // Restore input
      alert(err instanceof Error ? err.message : 'Failed to send message. Please try again.')
    } finally {
      setChatLoading(false)
    }
  }

  // Check if answer is submitted
  const isSubmitted = progress?.status === 'correct' || progress?.status === 'wrong'
  const isCorrect = progress?.status === 'correct'
  const isWrong = progress?.status === 'wrong'
  
  // Determine if there's a next question available
  // Only show Next button if we have an index and there are more questions
  const hasNextQuestion = currentIndex !== null && currentIndex + 1 < totalQuestions

  // HARD, UNAVOIDABLE: Next button MUST call /api/answer before navigation
  async function handleNextQuestion() {
    if (currentIndex === null) {
      // Index is unknown (e.g., resumed from DB); do not attempt next
      return
    }

    // ENFORCEMENT: If answer not submitted, submit it first
    if (!hasSubmitted && question && selectedAnswers.length > 0) {
      try {
        setSubmitting(true)
        setError(null)

        // 1. Call POST /api/answer (MANDATORY)
        const answerResponse = await fetch('/api/answer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            questionId: question.id,
            selectedAnswers: selectedAnswers,
          }),
        })

        if (!answerResponse.ok) {
          if (answerResponse.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to submit answer')
        }

        const answerData = await answerResponse.json()

        if (!answerData.success) {
          throw new Error(answerData.message || 'Failed to submit answer')
        }

        // 2. Wait for success
        // Answer is now saved to database

        // 3. THEN navigate to next question
        setHasSubmitted(true)
        setProgress({
          status: answerData.status,
          selected_answer: answerData.selectedAnswers,
        })
      } catch (err) {
        console.error('Error submitting answer before navigation:', err)
        setError(err instanceof Error ? err.message : 'Failed to submit answer')
        setSubmitting(false)
        // STOP navigation if API call fails
        return
      } finally {
        setSubmitting(false)
      }
    }

    // If already submitted or no answer selected, proceed to next question
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

      setQuestion(data.question)
      const newIndex = typeof data.index === 'number' ? data.index : currentIndex + 1
      setCurrentIndex(newIndex)
      if (typeof data.totalQuestions === 'number') {
        setTotalQuestions(data.totalQuestions)
      }
      setProgress({ status: 'not_started' })
      setSelectedAnswers([])
      setHasSubmitted(false) // Reset submission state for new question

      // Update progress: save the new index so user can resume from here
      try {
        await fetch('/api/progress/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            currentIndex: newIndex,
          }),
        })
      } catch (updateErr) {
        // Non-critical: progress update failed, but question loaded successfully
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
        {/* User Identity Header */}
        {user && (
          <div className={styles.userHeader}>
            <span className={styles.userLabel}>Logged in as:</span>
            <span className={styles.userEmail}>{user.email}</span>
          </div>
        )}

        {/* Question Number */}
        {currentIndex !== null && (
          <div className={styles.questionNumber}>
            Question {currentIndex + 1} of {totalQuestions}
          </div>
        )}

        {/* Domain */}
        <div className={styles.domain}>{question.domain}</div>

        {/* Question Text */}
        <h1 className={styles.questionText}>{question.question_text}</h1>

        {/* Options */}
        <div className={styles.optionsContainer}>
          {question.options && Object.entries(question.options).map(([key, value]) => {
            const isSelected = selectedAnswers.includes(key)
            const isCorrectAnswer = question.correct_answers.includes(key)
            const showCorrectness = isSubmitted

            let optionClass = styles.option
            if (isSelected) {
              optionClass += ` ${styles.selected}`
            }
            if (showCorrectness && isCorrectAnswer) {
              optionClass += ` ${styles.correct}`
            }
            if (showCorrectness && isSelected && !isCorrectAnswer) {
              optionClass += ` ${styles.incorrect}`
            }
            if (isSubmitted) {
              optionClass += ` ${styles.readOnly}`
            }

            return (
              <button
                key={key}
                className={optionClass}
                onClick={() => handleAnswerToggle(key)}
                disabled={isSubmitted}
                type="button"
              >
                <span className={styles.optionKey}>{key}</span>
                <span className={styles.optionText}>{value}</span>
                {showCorrectness && isCorrectAnswer && (
                  <span className={styles.correctBadge}>✓ Correct</span>
                )}
                {showCorrectness && isSelected && !isCorrectAnswer && (
                  <span className={styles.incorrectBadge}>✗ Your Answer</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Submit Button - Only show when NOT submitted */}
        {!hasSubmitted && (
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={selectedAnswers.length === 0 || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        )}

        {/* Status Display - Only show when submitted */}
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
                    {progress.wrong_count && progress.wrong_count > 1 && (
                      <span className={styles.wrongCount}>
                        {' '}(Wrong {progress.wrong_count} times)
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className={styles.readOnlyNotice}>
                Answer submitted. This question is now read-only.
              </div>
            </div>

            {/* Next Question Button - Only show when submitted and there's a next question */}
            {hasSubmitted && hasNextQuestion && (
              <button
                type="button"
                className={styles.nextButton}
                onClick={handleNextQuestion}
                disabled={loading || submitting}
              >
                {loading ? 'Loading...' : 'Next Question'}
              </button>
            )}
            
            {/* Completion Message - Show when submitted but no next question */}
            {hasSubmitted && !hasNextQuestion && currentIndex !== null && (
              <div className={styles.completionMessage}>
                🎉 You've completed all questions! Great work!
              </div>
            )}
          </>
        )}

        {/* Error Message */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Completion Message */}
        {completionMessage && <div className={styles.completionMessage}>{completionMessage}</div>}

        {/* Chat Panel */}
        <div className={styles.chatSection}>
          {!isChatOpen ? (
            <button
              className={styles.showChatButton}
              onClick={() => setIsChatOpen(true)}
              type="button"
            >
              💬 Ask AI about this question
            </button>
          ) : (
            <div className={styles.chatPanel}>
              <div className={styles.chatHeader}>
                <h2 className={styles.chatTitle}>Chat about this question</h2>
                <button
                  className={styles.hideChatButton}
                  onClick={() => setIsChatOpen(false)}
                  type="button"
                >
                  Hide
                </button>
              </div>

              <div className={styles.chatMessages}>
                {chatMessages.length === 0 ? (
                  <div className={styles.chatEmpty}>
                    No messages yet. Ask a question about this problem!
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${styles.chatMessage} ${
                        msg.role === 'user' ? styles.chatMessageUser : styles.chatMessageAssistant
                      }`}
                    >
                      <div className={styles.chatMessageRole}>
                        {msg.role === 'user' ? 'You' : 'AI'}
                      </div>
                      <div className={styles.chatMessageContent}>{msg.content}</div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className={`${styles.chatMessage} ${styles.chatMessageAssistant}`}>
                    <div className={styles.chatMessageRole}>AI</div>
                    <div className={styles.chatMessageContent}>
                      <span className={styles.chatLoading}>Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className={styles.chatForm}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about this problem..."
                  className={styles.chatInput}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  className={styles.chatSendButton}
                  disabled={!chatInput.trim() || chatLoading}
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Explanation Panel */}
        <div className={styles.explanationSection}>
          {!isExplanationOpen ? (
            <button
              className={styles.showExplanationButton}
              onClick={() => setIsExplanationOpen(true)}
              type="button"
            >
              Show Explanation
            </button>
          ) : (
            <div className={styles.explanationPanel}>
              <div className={styles.explanationHeader}>
                <h2 className={styles.explanationTitle}>Explanation</h2>
                <button
                  className={styles.hideExplanationButton}
                  onClick={() => setIsExplanationOpen(false)}
                  type="button"
                >
                  Hide
                </button>
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'official' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('official')}
                  type="button"
                >
                  Official
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'ai_en' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('ai_en')}
                  type="button"
                >
                  AI (EN)
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'ai_ch' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('ai_ch')}
                  type="button"
                >
                  AI (中文)
                </button>
              </div>

              {/* Tab Content */}
              <div className={styles.tabContent}>
                {activeTab === 'official' && (
                  <div className={styles.explanationText}>
                    {question.explanation || 'No official explanation available.'}
                  </div>
                )}
                {activeTab === 'ai_en' && (
                  <div className={styles.explanationText}>
                    {question.explanation_ai_en || 'AI explanation in English is not available.'}
                  </div>
                )}
                {activeTab === 'ai_ch' && (
                  <div className={styles.explanationText}>
                    {question.explanation_ai_ch || 'AI 中文解释暂不可用。'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

