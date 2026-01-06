/**
 * Login Page (Placeholder for Phase 3A)
 * 
 * This is a minimal placeholder to allow testing.
 * Full login implementation is not part of Phase 3A scope.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    try {
      setLoading(true)
      setMessage(null)

      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Magic link sent! Check your email. (Note: In development, check console for token)')
      } else {
        setMessage(data.message || 'Failed to send magic link')
      }
    } catch (error) {
      setMessage('Error sending magic link')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>ACAMS Learning System</h1>
        <p className={styles.subtitle}>Enter your email to sign in</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
            disabled={loading}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={loading || !email}
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {message && (
          <div className={styles.message}>{message}</div>
        )}

        <div className={styles.note}>
          <p>Note: This is a placeholder login page for Phase 3A testing.</p>
          <p>For full authentication flow, check the magic link in your email or use the API directly.</p>
        </div>
      </div>
    </div>
  )
}

