'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function PaidPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill email from localStorage if available
  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payment/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to activate access. Please try again.');
        setLoading(false);
        return;
      }

      // Success - store email and redirect
      const normalizedEmail = email.trim().toLowerCase();
      localStorage.setItem('userEmail', normalizedEmail);
      setSuccess(true);
      
      // Redirect to questions page with success parameter
      setTimeout(() => {
        router.push('/questions?activated=true');
      }, 2000);
    } catch (err) {
      console.error('Error activating access:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.successIcon}>🎉</div>
        <h1 className={styles.title}>Payment successful</h1>
        
        {!success ? (
          <>
            <p className={styles.subtitle}>
              Please enter the email you use on ACAMS to activate full access.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="your.email@example.com"
                className={styles.input}
                required
                disabled={loading}
              />

              {error && (
                <div className={styles.error}>
                  {error}
                  {error.includes('wrong email') && (
                    <p className={styles.errorHint}>
                      If you entered the wrong email, please try again.
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={styles.button}
              >
                {loading ? 'Activating...' : 'Activate Access'}
              </button>
            </form>
          </>
        ) : (
          <div className={styles.successMessage}>
            <p className={styles.successText}>Access activated successfully!</p>
            <p className={styles.redirectText}>Redirecting to question bank...</p>
            <Link href="/questions" className={styles.link}>
              Go to Question Bank →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

