'use client'

/**
 * Login page: single-admin username/password sign-in.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data?.success) {
          router.replace('/dashboard')
        }
      } catch {
        // Not signed in; stay on the login page.
      }
    }

    checkSession()
    return () => {
      cancelled = true
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password || loading) return

    try {
      setLoading(true)
      setMessage(null)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json().catch(() => null)

      if (response.ok && data?.success) {
        router.replace('/dashboard')
        return
      }

      setMessage(data?.message || 'Invalid username or password')
    } catch (error) {
      console.error(error)
      setMessage('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>ACAMS Learning System</h1>
        <p className={styles.subtitle}>Sign in to continue</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            autoComplete="username"
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            autoComplete="current-password"
            required
            disabled={loading}
          />
          <button type="submit" className={styles.button} disabled={loading || !username || !password}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {message && <div className={styles.message}>{message}</div>}
      </div>
    </div>
  )
}
