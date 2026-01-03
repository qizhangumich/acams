'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Question, QuestionProgress } from '@/types';
import styles from './page.module.css';

export default function QuestionsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [progress, setProgress] = useState<Record<number, QuestionProgress>>({});
  const [loading, setLoading] = useState(true);
  const [aiLanguage, setAiLanguage] = useState<'English' | 'Chinese'>('English');
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
          
          // Check for query parameter to navigate to specific question
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const questionIndex = params.get('q');
            if (questionIndex) {
              const index = parseInt(questionIndex, 10);
              if (!isNaN(index) && index >= 0 && index < data.questions.length) {
                setCurrentIndex(index);
              }
            }
          }
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

  // Restore selected answers when question changes
  useEffect(() => {
    if (questions.length === 0) return;
    const currentQuestion = questions[currentIndex];
    const questionProgress = progress[currentQuestion.id];
    
    if (questionProgress?.answered) {
      // If already answered, show the result and restore selected answers
      setShowResult(true);
      if (questionProgress.userAnswers) {
        setSelectedAnswers(questionProgress.userAnswers);
      }
    } else {
      setSelectedAnswers([]);
      setShowResult(false);
    }
  }, [currentIndex, questions, progress]);

  const handleAnswerToggle = (option: string) => {
    if (showResult) return; // Don't allow changes after submission

    const currentQuestion = questions[currentIndex];
    const isMultiple = currentQuestion.correct_answers.length > 1;

    if (isMultiple) {
      setSelectedAnswers(prev =>
        prev.includes(option)
          ? prev.filter(a => a !== option)
          : [...prev, option]
      );
    } else {
      setSelectedAnswers([option]);
    }
  };

  const handleSubmit = async () => {
    if (selectedAnswers.length === 0) return;

    const currentQuestion = questions[currentIndex];
    const isCorrect =
      selectedAnswers.length === currentQuestion.correct_answers.length &&
      selectedAnswers.every(answer => currentQuestion.correct_answers.includes(answer)) &&
      currentQuestion.correct_answers.every(answer => selectedAnswers.includes(answer));

    setShowResult(true);

    // Save progress
    if (email) {
      try {
        await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            questionId: currentQuestion.id,
            correct: isCorrect,
            userAnswers: selectedAnswers,
          }),
        });
        
        // Update local progress state
        setProgress(prev => ({
          ...prev,
          [currentQuestion.id]: {
            answered: true,
            correct: isCorrect,
            lastAnsweredAt: new Date().toISOString(),
            userAnswers: selectedAnswers,
          },
        }));
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswers([]);
      setShowResult(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswers([]);
      setShowResult(false);
    }
  };

  const handleReset = async () => {
    if (!email) return;
    
    if (confirm('Are you sure you want to reset all your progress? This cannot be undone.')) {
      try {
        await fetch('/api/progress/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        setProgress({});
        setCurrentIndex(0);
        setSelectedAnswers([]);
        setShowResult(false);
        setAiExplanation(null);
        setAiError(null);
      } catch (error) {
        console.error('Failed to reset progress:', error);
      }
    }
  };

  const handleAiExplain = async () => {
    if (!email || aiLoading) return;

    const currentQuestion = questions[currentIndex];
    const questionProgress = progress[currentQuestion.id];
    const userAnswers = questionProgress?.userAnswers || selectedAnswers;

    if (!userAnswers || userAnswers.length === 0) {
      setAiError('No user answers found');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiExplanation(null);

    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          question: currentQuestion.normalized_question,
          options: currentQuestion.options,
          correct_answers: currentQuestion.correct_answers,
          user_answers: userAnswers,
          topic: currentQuestion.domain,
          language: aiLanguage,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAiError(data.error || 'Failed to generate AI explanation');
        return;
      }

      setAiExplanation(data.explanation);
    } catch (error) {
      console.error('Error fetching AI explanation:', error);
      setAiError('Failed to generate AI explanation. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // Reset AI explanation when question changes
  useEffect(() => {
    setAiExplanation(null);
    setAiError(null);
  }, [currentIndex, aiLanguage]);

  if (loading || !email || questions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const questionProgress = progress[currentQuestion.id];
  const isAnswered = questionProgress?.answered || false;
  const isCorrect = questionProgress?.correct || false;

  // Calculate stats
  const answeredCount = Object.values(progress).filter(p => p.answered).length;
  const correctCount = Object.values(progress).filter(p => p.answered && p.correct).length;

  // Calculate wrong answers count
  const wrongCount = Object.values(progress).filter(p => p.answered && !p.correct).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.stats}>
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>Answered: {answeredCount} / {questions.length}</span>
          <span>Correct: {correctCount}</span>
          {wrongCount > 0 && <span>Wrong: {wrongCount}</span>}
        </div>
        <div className={styles.headerActions}>
          <span className={styles.email}>{email}</span>
          <Link href="/wrong-answers" className={styles.wrongAnswersLink}>
            Wrong Answers ({wrongCount})
          </Link>
          <Link
            href="/payment"
            className={styles.paymentButton}
          >
            💳 Upgrade
          </Link>
          <button onClick={handleReset} className={styles.resetButton}>
            Reset Progress
          </button>
        </div>
      </div>

      <div className={styles.navTabs}>
        <Link href="/questions" className={`${styles.navTab} ${styles.active}`}>
          Practice
        </Link>
        <Link href="/wrong-answers" className={styles.navTab}>
          Wrong Answers {wrongCount > 0 && <span className={styles.badge}>{wrongCount}</span>}
        </Link>
      </div>

      <div className={styles.questionCard}>
        <div className={styles.domain}>{currentQuestion.domain}</div>
        
        <div className={styles.languageToggleContainer}>
          <span className={styles.languageLabel}>AI Language:</span>
          <button
            onClick={() => setAiLanguage(aiLanguage === 'English' ? 'Chinese' : 'English')}
            className={styles.languageToggle}
          >
            {aiLanguage}
          </button>
        </div>
        
        <h2 className={styles.question}>{currentQuestion.normalized_question}</h2>

        <div className={styles.options}>
          {Object.entries(currentQuestion.options).map(([key, value]) => {
            const isSelected = selectedAnswers.includes(key);
            const isCorrectAnswer = currentQuestion.correct_answers.includes(key);
            const showCorrect = showResult && isCorrectAnswer;
            const showIncorrect = showResult && isSelected && !isCorrectAnswer;

            return (
              <button
                key={key}
                onClick={() => handleAnswerToggle(key)}
                disabled={showResult}
                className={`${styles.option} ${
                  isSelected ? styles.selected : ''
                } ${
                  showCorrect ? styles.correct : ''
                } ${
                  showIncorrect ? styles.incorrect : ''
                }`}
              >
                <span className={styles.optionKey}>{key}</span>
                <span className={styles.optionText}>{value}</span>
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className={styles.result}>
            <div className={`${styles.resultMessage} ${isCorrect ? styles.correctMessage : styles.incorrectMessage}`}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            
            {!isCorrect && (
              <div className={styles.aiExplanationSection}>
                <button
                  onClick={handleAiExplain}
                  disabled={aiLoading}
                  className={styles.aiExplainButton}
                >
                  {aiLoading ? 'Generating...' : '🤖 Explain this question (AI)'}
                </button>
                
                {aiError && (
                  <div className={styles.aiError}>{aiError}</div>
                )}
                
                {aiExplanation && (
                  <div className={styles.aiExplanationCard}>
                    <div className={styles.aiExplanationHeader}>
                      <div className={styles.aiExplanationTitle}>
                        <span className={styles.aiIcon}>✨</span>
                        AI Explanation
                      </div>
                      <div className={styles.aiLanguageBadge}>{aiLanguage}</div>
                    </div>
                    <div className={styles.aiExplanationContent}>
                      {aiExplanation.split('\n').map((line, index) => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) return <br key={index} />;
                        
                        // Check for bullet points
                        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
                          return (
                            <div key={index} className={styles.aiBulletPoint}>
                              {trimmedLine}
                            </div>
                          );
                        }
                        
                        // Check for numbered lists
                        if (/^\d+\./.test(trimmedLine)) {
                          return (
                            <div key={index} className={styles.aiNumberedPoint}>
                              {trimmedLine}
                            </div>
                          );
                        }
                        
                        // Check for headers (lines that end with colon and are short)
                        if (trimmedLine.endsWith(':') && trimmedLine.length < 50) {
                          return (
                            <div key={index} className={styles.aiSectionHeader}>
                              {trimmedLine}
                            </div>
                          );
                        }
                        
                        // Regular paragraph
                        return (
                          <div key={index} className={styles.aiParagraph}>
                            {trimmedLine}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className={styles.actions}>
          {!showResult ? (
            <button
              onClick={handleSubmit}
              disabled={selectedAnswers.length === 0}
              className={styles.submitButton}
            >
              Submit Answer
            </button>
          ) : (
            <div className={styles.navigationButtons}>
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={styles.navButton}
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === questions.length - 1}
                className={styles.navButton}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

