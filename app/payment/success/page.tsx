'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function PaymentSuccessPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    setEmail(storedEmail);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✓</div>
        <h1>Payment Successful!</h1>
        <p>Thank you for upgrading to Premium. Your account has been activated.</p>
        <p className={styles.emailNote}>
          Confirmation sent to: {email || 'your email'}
        </p>
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

