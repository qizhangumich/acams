'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

function PaidPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Retrieve subscription email: prioritize user's existing email, then URL param, then subscriptionEmail
  useEffect(() => {
    // Priority 1: User's existing email (from before payment)
    const userEmail = localStorage.getItem('userEmail');
    
    // Priority 2: URL query param
    const emailFromUrl = searchParams.get('email');
    
    // Priority 3: Subscription email from /subscribe page
    const subscriptionEmail = localStorage.getItem('subscriptionEmail');
    
    // Use user's existing email if available, otherwise use subscription email or URL param
    const finalEmail = userEmail || emailFromUrl || subscriptionEmail;
    
    if (finalEmail) {
      // Skip temp emails (placeholders)
      if (!finalEmail.startsWith('temp_')) {
        const normalizedEmail = finalEmail.trim().toLowerCase();
        setEmail(normalizedEmail);
        
        // Auto-activate if user has existing email (they already entered it before payment)
        if (userEmail && !userEmail.startsWith('temp_')) {
          // Auto-activate after a short delay
          setTimeout(() => {
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
            handleSubmit(fakeEvent);
          }, 800);
        }
      }
    }
  }, [searchParams]);

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

      // Success - upgrade account with subscription email
      const normalizedEmail = email.trim().toLowerCase();
      
      // Update userEmail to subscription email (becomes authoritative)
      localStorage.setItem('userEmail', normalizedEmail);
      
      // Clear temporary subscription email
      localStorage.removeItem('subscriptionEmail');
      
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
              Your subscription email will be used as your paid account identity.
            </p>
            {!email && (
              <div className={styles.infoBox}>
                <strong>Note:</strong> Please enter the email you used during subscription.
              </div>
            )}

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

export default function PaidPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </div>
    }>
      <PaidPageContent />
    </Suspense>
  );
}

