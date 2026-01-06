/**
 * Review Mode Page
 * 
 * Phase 4: Read-only review mode
 * 
 * Features:
 * - Read-only question view
 * - Explanation expanded by default
 * - Chat history visible
 * - Optional continued chat (append-only)
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface Question {
  id: number
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

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export default function ReviewModePage() {
  const router = useRouter()
  const params = useParams()
  const questionId = parseInt(params.questionId as string)

  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState<Question | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'official' | 'ai_en' | 'ai_ch'>('official')

  useEffect(() => {
    if (questionId) {
      loadQuestion()
    }
  }, [questionId])

  async function loadQuestion() {
    try {
      setLoading(true)

      // Load question
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

      // Load progress
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

      // Load chat history
      const chatResponse = await fetch(`/api/chat/${questionId}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (chatResponse.ok) {
        const chatData = await chatResponse.json()
        if (chatData.success && chatData.messages) {
          setChatMessages(chatData.messages)
        }
      }
    } catch (err) {
      console.error('Error loading question:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!question || !chatInput.trim() || chatLoading) {
      return
    }

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
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
        await loadQuestion() // Reload to get updated chat history
      } else {
        throw new Error(data.message || 'Failed to get AI response')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setChatMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id))
      setChatInput(userMessage)
      alert(err instanceof Error ? err.message : 'Failed to send message. Please try again.')
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading question...</div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Question not found</div>
        <Link href="/review/queue" className={styles.backButton}>
          Back to Queue
        </Link>
      </div>
    )
  }

  const isWrong = progress?.status === 'wrong'

  return (
    <div className={styles.container}>
      <div className={styles.reviewCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.domain}>{question.domain}</div>
            {isWrong && progress.wrong_count && (
              <div className={styles.wrongBadge}>
                Wrong {progress.wrong_count} time{progress.wrong_count > 1 ? 's' : ''}
              </div>
            )}
          </div>
          <Link href="/review/queue" className={styles.backLink}>
            ← Back to Queue
          </Link>
        </div>

        {/* Question Text */}
        <h1 className={styles.questionText}>{question.question_text}</h1>

        {/* Options (Read-only, showing correct answers) */}
        <div className={styles.optionsContainer}>
          {question.options && Object.entries(question.options).map(([key, value]) => {
            const isCorrectAnswer = question.correct_answers.includes(key)
            const wasSelected = progress?.selected_answer?.includes(key)

            let optionClass = styles.option
            if (isCorrectAnswer) {
              optionClass += ` ${styles.correct}`
            }
            if (wasSelected && !isCorrectAnswer) {
              optionClass += ` ${styles.incorrect}`
            }

            return (
              <div key={key} className={optionClass}>
                <span className={styles.optionKey}>{key}</span>
                <span className={styles.optionText}>{value}</span>
                {isCorrectAnswer && (
                  <span className={styles.correctBadge}>✓ Correct</span>
                )}
                {wasSelected && !isCorrectAnswer && (
                  <span className={styles.incorrectBadge}>✗ Your Answer</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Explanation Panel (Expanded by default) */}
        <div className={styles.explanationSection}>
          <div className={styles.explanationPanel}>
            <div className={styles.explanationHeader}>
              <h2 className={styles.explanationTitle}>Explanation</h2>
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
        </div>

        {/* Chat Panel (Visible) */}
        <div className={styles.chatSection}>
          <div className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <h2 className={styles.chatTitle}>Chat about this question</h2>
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
        </div>
      </div>
    </div>
  )
}

