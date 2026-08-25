'use client'

/**
 * Grid of answered questions for quick jumping, colored by result.
 */

import styles from '../page.module.css'

export interface DoneQuestion {
  id: number
  index: number
  status: 'correct' | 'wrong'
}

interface DoneNavigatorProps {
  doneQuestions: DoneQuestion[]
  currentIndex: number | null
  onJump: (index: number) => void
}

export default function DoneNavigator({ doneQuestions, currentIndex, onJump }: DoneNavigatorProps) {
  if (doneQuestions.length === 0) return null

  return (
    <div className={styles.doneNavigator} aria-label="Answered question navigation">
      <div className={styles.doneNavigatorHeader}>
        <span>Answered Questions</span>
        <span>{doneQuestions.length} done</span>
      </div>
      <div className={styles.doneQuestionGrid}>
        {doneQuestions.map((item) => {
          const isCurrent = currentIndex === item.index
          const buttonClass = [
            styles.doneQuestionButton,
            item.status === 'correct' ? styles.doneQuestionCorrect : styles.doneQuestionWrong,
            isCurrent ? styles.doneQuestionCurrent : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={item.id}
              type="button"
              className={buttonClass}
              onClick={() => onJump(item.index)}
              aria-label={`Go to question ${item.index + 1}, ${item.status}`}
            >
              {item.index + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}
