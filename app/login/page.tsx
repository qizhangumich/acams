/**
 * Login Page (Placeholder for Phase 3A)
 * 
 * This is a minimal placeholder to allow testing.
 * Full login implementation is not part of Phase 3A scope.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Read error from URL parameters
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      const errorMessages: Record<string, string> = {
        missing_parameters: 'Missing token or email. Please request a new magic link.',
        verification_failed: 'Verification failed. The link may be invalid or expired.',
        invalid_magic_link: 'Invalid magic link. Please request a new one.',
        'Magic link expired': 'Magic link expired. Please request a new one.',
        'Magic link already used': 'This magic link has already been used. Please request a new one.',
        user_not_found: 'User not found. Please try again.',
      }
      setMessage(errorMessages[error] || `Error: ${decodeURIComponent(error)}`)
    }
  }, [searchParams])

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

