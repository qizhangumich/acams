'use client'

/**
 * GET /auth/verify
 * 
 * Magic link verification page
 * Calls API to verify token and handles redirects
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')

  useEffect(() => {
    async function verifyToken() {
      // Get token from URL
      const token = searchParams.get('token')
      const email = searchParams.get('email') // Optional

      // Missing token - redirect to login
      if (!token) {
        router.push('/login?error=missing_token')
        return
      }

      // Normalize token
      const normalizedToken = token.trim()

      try {
        // Call verification API
        // The API will set the session cookie
        const apiUrl = `/api/auth/verify?token=${encodeURIComponent(normalizedToken)}${email ? `&email=${encodeURIComponent(email)}` : ''}`
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include', // Important: include cookies
          cache: 'no-store', // Ensure fresh request
        })

        const data = await response.json()

        // Parse JSON response and handle redirects in PAGE (not API)
        if (!response.ok || !data.success) {
          // Verification failed - redirect to login with error
          const error = data.error || 'verification_failed'
          setStatus('error')
          router.replace(`/login?error=${encodeURIComponent(error)}`)
          return
        }

        // Verification successful - cookie is already set by API
        // Now redirect to questions page
        setStatus('success')
        router.replace('/questions')
      } catch (error) {
        // Log error and redirect to login
        console.error('Error verifying magic link:', error)
        router.push('/login?error=verification_failed')
        setStatus('error')
      }
    }

    verifyToken()
  }, [router, searchParams])

  // Show loading state while verifying
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <p>Verifying magic link...</p>
            <div style={{ marginTop: '1rem' }}>Please wait...</div>
          </>
        )}
        {status === 'error' && (
          <p>Verification failed. Redirecting...</p>
        )}
        {status === 'success' && (
          <p>Verification successful. Redirecting...</p>
        )}
      </div>
    </div>
  )
}

