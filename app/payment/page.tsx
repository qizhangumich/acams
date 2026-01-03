'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';
import styles from './page.module.css';

// Initialize Stripe
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const { clientSecret, error: apiError } = await response.json();

      if (apiError) {
        setError(apiError);
        setLoading(false);
        return;
      }

      // Confirm payment
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.paymentForm}>
      <PaymentElement />
      
      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className={styles.submitButton}
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>

      <Link href="/questions" className={styles.cancelLink}>
        Cancel
      </Link>
    </form>
  );
}

export default function PaymentPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createPaymentIntent() {
      try {
        const email = localStorage.getItem('userEmail') || '';
        const response = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setClientSecret(data.clientSecret);
        }
      } catch (err) {
        setError('Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    }

    createPaymentIntent();
  }, []);

  const options = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#667eea',
        colorBackground: '#ffffff',
        colorText: '#1a1a1a',
        colorDanger: '#f44336',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading payment form...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h2>Payment Error</h2>
          <p>{error}</p>
          <Link href="/questions" className={styles.backButton}>
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h2>Payment Unavailable</h2>
          <p>Stripe is not configured. Please contact support.</p>
          <Link href="/questions" className={styles.backButton}>
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h2>Payment Unavailable</h2>
          <p>Unable to initialize payment. Please try again later.</p>
          <Link href="/questions" className={styles.backButton}>
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Upgrade to Premium</h1>
        <Link href="/questions" className={styles.backLink}>
          ← Back
        </Link>
      </div>

      <div className={styles.paymentCard}>
        <div className={styles.pricingInfo}>
          <h2>Premium Features</h2>
          <ul className={styles.featuresList}>
            <li>✓ Unlimited AI explanations</li>
            <li>✓ Priority support</li>
            <li>✓ Advanced progress tracking</li>
            <li>✓ Export your progress</li>
          </ul>
          <div className={styles.price}>$9.99 / month</div>
        </div>

        <div className={styles.paymentSection}>
          <h3>Payment Details</h3>
          <p className={styles.paymentNote}>
            🍎 Apple Pay, Google Pay, and all major credit cards accepted
          </p>
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm />
          </Elements>
        </div>
      </div>
    </div>
  );
}

