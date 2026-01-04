'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

function PaidPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);

  // Confirm payment using context_id from URL
  useEffect(() => {
    // Read context_id from URL (Stripe passes it as client_reference_id)
    const contextId = searchParams.get('client_reference_id') || 
                      searchParams.get('ctx') || 
                      searchParams.get('context_id');

    if (!contextId) {
      setError('Payment context ID not found. Please contact support.');
      return;
    }

    // Auto-confirm payment
    const confirmPayment = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context_id: contextId }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to confirm payment. Please try again.');
          setLoading(false);
          return;
        }

        // Success - payment confirmed and account upgraded
        const normalizedEmail = data.email;
        
        // Update userEmail to confirmed email (becomes authoritative)
        localStorage.setItem('userEmail', normalizedEmail);
        
        setConfirmedEmail(normalizedEmail);
        setSuccess(true);
        setLoading(false);
        
        // Redirect to questions page with success parameter
        setTimeout(() => {
          router.push('/questions?activated=true');
        }, 2000);
      } catch (err) {
        console.error('Error confirming payment:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams, router]);


  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.successIcon}>🎉</div>
        <h1 className={styles.title}>Payment successful</h1>
        
        {!success ? (
          <>
            {loading ? (
              <>
                <p className={styles.subtitle}>
                  Confirming your payment and upgrading your account...
                </p>
                <div className={styles.loadingSpinner}>
                  <div className={styles.spinner}></div>
                  <p>Please wait...</p>
                </div>
              </>
            ) : (
              <>
                <p className={styles.subtitle}>
                  Processing your payment confirmation...
                </p>
                {error && (
                  <div className={styles.error}>
                    {error}
                    <p className={styles.errorHint}>
                      If this problem persists, please contact support with your payment reference.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className={styles.successMessage}>
            <p className={styles.successText}>Payment confirmed successfully!</p>
            <p className={styles.confirmedEmail}>Account: {confirmedEmail}</p>
            <p className={styles.redirectText}>Upgrading to Premium and redirecting...</p>
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

