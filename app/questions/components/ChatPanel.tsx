'use client'

/**
 * Per-question AI chat panel. Loads history for the question and sends
 * messages through /api/chat/[questionId]. Self-contained per questionId.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../page.module.css'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export default function ChatPanel({ questionId }: { questionId: number }) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setMessages([])
    loadHistory(questionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId])

  async function loadHistory(id: number) {
    try {
      const response = await fetch(`/api/chat/${id}`, {
        method: 'GET',
        credentials: 'include',
      })
      if (!response.ok) {
        if (response.status === 401) router.push('/login')
        return
      }
      const data = await response.json()
      setMessages(data.success && data.messages ? data.messages : [])
    } catch (err) {
      console.error('Error loading chat history:', err)
      setMessages([])
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)

    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const response = await fetch(`/api/chat/${questionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: userMessage }),
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
        await loadHistory(questionId)
      } else {
        throw new Error(data.message || 'Failed to get AI response')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id))
      setInput(userMessage)
      alert(err instanceof Error ? err.message : 'Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.chatSection}>
      {!isOpen ? (
        <button className={styles.showChatButton} onClick={() => setIsOpen(true)} type="button">
          💬 Ask AI about this question
        </button>
      ) : (
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <h2 className={styles.chatTitle}>Chat about this question</h2>
            <button className={styles.hideChatButton} onClick={() => setIsOpen(false)} type="button">
              Hide
            </button>
          </div>

          <div className={styles.chatMessages}>
            {messages.length === 0 ? (
              <div className={styles.chatEmpty}>No messages yet. Ask a question about this problem!</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.chatMessage} ${
                    msg.role === 'user' ? styles.chatMessageUser : styles.chatMessageAssistant
                  }`}
                >
                  <div className={styles.chatMessageRole}>{msg.role === 'user' ? 'You' : 'AI'}</div>
                  <div className={styles.chatMessageContent}>{msg.content}</div>
                </div>
              ))
            )}
            {sending && (
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this problem..."
              className={styles.chatInput}
              disabled={sending}
            />
            <button type="submit" className={styles.chatSendButton} disabled={!input.trim() || sending}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
