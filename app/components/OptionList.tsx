'use client'

/**
 * Selectable answer-option list shared by the exam runner and review
 * session. After submission, pass `reveal` to color correct/incorrect
 * choices.
 */

import styles from './OptionList.module.css'

interface OptionListProps {
  options: Record<string, string>
  selected: string[]
  onToggle: (key: string) => void
  disabled?: boolean
  reveal?: { correct: string[] } | null
}

export default function OptionList({ options, selected, onToggle, disabled, reveal }: OptionListProps) {
  const keys = Object.keys(options).sort()

  return (
    <div className={styles.list}>
      {keys.map((key) => {
        const isSelected = selected.includes(key)
        const isCorrect = reveal?.correct.includes(key) ?? false
        const classNames = [styles.option]
        if (isSelected) classNames.push(styles.selected)
        if (reveal) {
          if (isCorrect) classNames.push(styles.correct)
          else if (isSelected) classNames.push(styles.incorrect)
        }

        return (
          <button
            key={key}
            type="button"
            className={classNames.join(' ')}
            onClick={() => onToggle(key)}
            disabled={disabled}
          >
            <span className={styles.letter}>{key}</span>
            <span className={styles.text}>{options[key]}</span>
            {reveal && isCorrect && <span className={styles.mark}>✓</span>}
            {reveal && !isCorrect && isSelected && <span className={styles.mark}>✗</span>}
          </button>
        )
      })}
    </div>
  )
}
