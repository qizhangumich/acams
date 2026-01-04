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
    
    // Email is optional - allow placeholder or empty
    // Only validate if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address or leave it empty');
        return;
      }
      // Store email in localStorage (not authoritative)
      localStorage.setItem('userEmail', email);
    } else {
      // Use placeholder for progress tracking
      localStorage.setItem('userEmail', 'temp_' + Date.now());
    }
    
    // Navigate to questions
    router.push('/questions');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>ACAMS Question Bank</h1>
        <p className={styles.subtitle}>You can start learning right away</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="email" className={styles.label}>
            Email (optional - for progress tracking)
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="your.email@example.com (optional)"
            className={styles.input}
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

