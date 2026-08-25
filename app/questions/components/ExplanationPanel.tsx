'use client'

/**
 * Collapsible explanation panel with Official / AI (中文) tabs.
 */

import { useState } from 'react'
import styles from '../page.module.css'

interface ExplanationPanelProps {
  explanation: string
  explanationAiCh?: string | null
}

export default function ExplanationPanel({ explanation, explanationAiCh }: ExplanationPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'official' | 'ai_ch'>('official')

  return (
    <div className={styles.explanationSection}>
      {!isOpen ? (
        <button className={styles.showExplanationButton} onClick={() => setIsOpen(true)} type="button">
          Show Explanation
        </button>
      ) : (
        <div className={styles.explanationPanel}>
          <div className={styles.explanationHeader}>
            <h2 className={styles.explanationTitle}>Explanation</h2>
            <button
              className={styles.hideExplanationButton}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Hide
            </button>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'official' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('official')}
              type="button"
            >
              Official
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'ai_ch' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('ai_ch')}
              type="button"
            >
              AI (中文)
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'official' && (
              <div className={styles.explanationText}>
                {explanation || 'No official explanation available.'}
              </div>
            )}
            {activeTab === 'ai_ch' && (
              <div className={styles.explanationText}>
                {explanationAiCh || 'AI 中文解释暂不可用。'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
