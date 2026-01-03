'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

function PaymentSuccessContent() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    if (!storedEmail) {
      router.push('/');
      return;
    }
    setEmail(storedEmail);

    // Mark user as subscribed after successful payment
    async function activateSubscription() {
      try {
        const response = await fetch('/api/subscription/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: storedEmail,
            subscribed: true,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to activate subscription');
        }
      } catch (err) {
        console.error('Error activating subscription:', err);
        setError('Payment successful, but subscription activation failed. Please contact support.');
      } finally {
        setLoading(false);
      }
    }

    activateSubscription();
  }, [router]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Activating your subscription...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✓</div>
        <h1>Payment Successful!</h1>
        <p>Thank you for subscribing. Your premium account has been activated.</p>
        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}
        {!error && (
          <div className={styles.benefits}>
            <h2>You now have:</h2>
            <ul>
              <li>✓ Unlimited AI explanations</li>
              <li>✓ Priority support</li>
              <li>✓ Advanced progress tracking</li>
            </ul>
          </div>
        )}
        <div className={styles.actions}>
          <Link href="/questions" className={styles.primaryButton}>
            Continue Practicing
          </Link>
          <Link href="/wrong-answers" className={styles.secondaryButton}>
            Review Wrong Answers
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

