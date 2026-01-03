'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Question, QuestionProgress } from '@/types';
import styles from './page.module.css';

export default function WrongAnswersPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<Record<number, QuestionProgress>>({});
  const [loading, setLoading] = useState(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);

  // Load email from localStorage
  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    if (!storedEmail) {
      router.push('/');
      return;
    }
    setEmail(storedEmail);
  }, [router]);

  // Load questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch('/api/questions');
        if (response.ok) {
          const data = await response.json();
          setQuestions(data.questions);
        }
      } catch (error) {
        console.error('Failed to load questions:', error);
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, []);

  // Load progress
  useEffect(() => {
    if (!email) return;

    const userEmail = email; // Store in local variable for type narrowing
    async function loadProgress() {
      try {
        const response = await fetch(`/api/progress?email=${encodeURIComponent(userEmail)}`);
        if (response.ok) {
          const data = await response.json();
          setProgress(data.progress || {});
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    }
    loadProgress();
  }, [email]);

  if (loading || !email || questions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  // Get wrong answers
  const wrongAnswers = questions.filter(q => {
    const questionProgress = progress[q.id];
    return questionProgress?.answered && !questionProgress?.correct;
  });

  const handleQuestionClick = (questionId: number) => {
    setSelectedQuestionId(selectedQuestionId === questionId ? null : questionId);
  };

  const handleGoToQuestion = (questionId: number) => {
    // Find the index of the question
    const index = questions.findIndex(q => q.id === questionId);
    if (index !== -1) {
      router.push(`/questions?q=${index}`);
    }
  };

  if (wrongAnswers.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Wrong Answers</h1>
          <Link href="/questions" className={styles.backButton}>
            ← Back to Practice
          </Link>
        </div>
        <div className={styles.navTabs}>
          <Link href="/questions" className={styles.navTab}>
            Practice
          </Link>
          <Link href="/wrong-answers" className={`${styles.navTab} ${styles.active}`}>
            Wrong Answers
          </Link>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✓</div>
          <h2>No Wrong Answers Yet!</h2>
          <p>Great job! You haven't answered any questions incorrectly.</p>
          <Link href="/questions" className={styles.primaryButton}>
            Start Practicing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Wrong Answers ({wrongAnswers.length})</h1>
        <div className={styles.headerActions}>
          <Link href="/questions" className={styles.backButton}>
            ← Back to Practice
          </Link>
          <Link
            href="/payment"
            className={styles.paymentButton}
          >
            💳 Upgrade
          </Link>
        </div>
      </div>

      <div className={styles.navTabs}>
        <Link href="/questions" className={styles.navTab}>
          Practice
        </Link>
        <Link href="/wrong-answers" className={`${styles.navTab} ${styles.active}`}>
          Wrong Answers <span className={styles.badge}>{wrongAnswers.length}</span>
        </Link>
      </div>

      <div className={styles.wrongAnswersList}>
        {wrongAnswers.map((question) => {
          const questionProgress = progress[question.id];
          const isExpanded = selectedQuestionId === question.id;

          return (
            <div key={question.id} className={styles.wrongAnswerCard}>
              <div
                className={styles.cardHeader}
                onClick={() => handleQuestionClick(question.id)}
              >
                <div className={styles.cardHeaderContent}>
                  <div className={styles.questionNumber}>Question #{question.id}</div>
                  <div className={styles.domain}>{question.domain}</div>
                  <div className={styles.questionPreview}>
                    {question.normalized_question}
                  </div>
                  {questionProgress?.userAnswers && (
                    <div className={styles.userAnswers}>
                      Your answer: {questionProgress.userAnswers.join(', ')}
                      {' → '}
                      <span className={styles.correctAnswer}>
                        Correct: {question.correct_answers.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                <button className={styles.expandButton}>
                  {isExpanded ? '▼' : '▶'}
                </button>
              </div>

              {isExpanded && (
                <div className={styles.cardContent}>
                  <div className={styles.fullQuestion}>
                    <h3>{question.normalized_question}</h3>
                    <div className={styles.options}>
                      {Object.entries(question.options).map(([key, value]) => {
                        const isUserAnswer = questionProgress?.userAnswers?.includes(key);
                        const isCorrect = question.correct_answers.includes(key);

                        return (
                          <div
                            key={key}
                            className={`${styles.option} ${
                              isCorrect ? styles.correctOption : ''
                            } ${
                              isUserAnswer && !isCorrect ? styles.incorrectOption : ''
                            }`}
                          >
                            <span className={styles.optionKey}>{key}</span>
                            <span className={styles.optionText}>{value}</span>
                            {isCorrect && <span className={styles.correctBadge}>✓ Correct</span>}
                            {isUserAnswer && !isCorrect && (
                              <span className={styles.incorrectBadge}>✗ Your Answer</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      onClick={() => handleGoToQuestion(question.id)}
                      className={styles.reviewButton}
                    >
                      Review in Practice Mode
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

