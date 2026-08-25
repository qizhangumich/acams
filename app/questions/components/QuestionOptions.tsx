'use client'

/**
 * Practice-mode option list: selectable before submission, then read-only
 * with correct/incorrect highlighting.
 */

import styles from '../page.module.css'

interface QuestionOptionsProps {
  options: Record<string, string>
  correctAnswers: string[]
  selectedAnswers: string[]
  isSubmitted: boolean
  onToggle: (key: string) => void
}

export default function QuestionOptions({
  options,
  correctAnswers,
  selectedAnswers,
  isSubmitted,
  onToggle,
}: QuestionOptionsProps) {
  return (
    <div className={styles.optionsContainer}>
      {options &&
        Object.entries(options)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => {
            const isSelected = selectedAnswers.includes(key)
            const isCorrectAnswer = correctAnswers.includes(key)
            const showCorrectness = isSubmitted

            let optionClass = styles.option
            if (isSelected) optionClass += ` ${styles.selected}`
            if (showCorrectness && isCorrectAnswer) optionClass += ` ${styles.correct}`
            if (showCorrectness && isSelected && !isCorrectAnswer) optionClass += ` ${styles.incorrect}`
            if (isSubmitted) optionClass += ` ${styles.readOnly}`

            return (
              <button
                key={key}
                className={optionClass}
                onClick={() => onToggle(key)}
                disabled={isSubmitted}
                type="button"
              >
                <span className={styles.optionKey}>{key}</span>
                <span className={styles.optionText}>{value}</span>
                {showCorrectness && isCorrectAnswer && (
                  <span className={styles.correctBadge}>✓ Correct</span>
                )}
                {showCorrectness && isSelected && !isCorrectAnswer && (
                  <span className={styles.incorrectBadge}>✗ Your Answer</span>
                )}
              </button>
            )
          })}
    </div>
  )
}
