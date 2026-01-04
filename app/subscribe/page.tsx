'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function SubscribePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-fill email from localStorage if available (but make it clear it can be changed)
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

    // Store email temporarily in localStorage for /paid page
    const normalizedEmail = email.trim().toLowerCase();
    localStorage.setItem('subscriptionEmail', normalizedEmail);

    // Redirect to Stripe Payment Link with email prefilled
    const paymentUrl = 
      'https://buy.stripe.com/bJe7sMcZ4bvC6954grcV200' +
      '?prefilled_email=' + encodeURIComponent(normalizedEmail);

    window.location.href = paymentUrl;
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Unlock Full Access</h1>
        
        <div className={styles.warningBox}>
          <div className={styles.warningIcon}>⚠️</div>
          <div className={styles.warningContent}>
            <strong>Important</strong>
            <p>The email you enter below will be used as your paid account identity.</p>
            <p>You will use this email to access paid content in the future.</p>
          </div>
        </div>

        <div className={styles.reassuranceBox}>
          <p>You may use a different email than the one you entered earlier.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <input
            id="email"
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
            <div className={styles.error}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
        </form>

        <div className={styles.footer}>
          <button
            onClick={() => router.back()}
            className={styles.backLink}
          >
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );
}

