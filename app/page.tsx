'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Home() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Store email in localStorage
    localStorage.setItem('userEmail', email);
    
    // Navigate to questions
    router.push('/questions');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>ACAMS Question Bank</h1>
        <p className={styles.subtitle}>Enter your email to begin practicing</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="your.email@example.com"
            className={styles.input}
            required
          />
          
          {error && <p className={styles.error}>{error}</p>}
          
          <button type="submit" className={styles.button}>
            Enter Question Bank
          </button>
        </form>
      </div>
    </div>
  );
}

