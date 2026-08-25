'use client'

/**
 * Per-question personal tags: loads, saves, and suggests tags
 * (acronyms detected in the question text). Self-contained per questionId.
 */

import { useEffect, useState } from 'react'
import styles from '../page.module.css'

const DEFAULT_TAG_ALIASES: Record<string, string> = {
  FIS: 'FI',
}

function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, ' ').toUpperCase()
}

interface TagSourceQuestion {
  id: number
  domain: string
  question_text: string
  explanation: string
  options: Record<string, string>
}

function getSuggestedTags(question: TagSourceQuestion) {
  const text = [
    question.domain,
    question.question_text,
    question.explanation,
    ...Object.values(question.options || {}),
  ].join(' ')

  const tagSet = new Set<string>()
  const acronymMatches = text.match(/\b[A-Z]{2,6}s?\b/g) || []
  const parentheticalMatches = text.match(/\(([A-Z]{2,6}s?)\)/g) || []

  for (const rawTag of [...acronymMatches, ...parentheticalMatches.map((tag) => tag.slice(1, -1))]) {
    const normalized = normalizeTag(DEFAULT_TAG_ALIASES[rawTag] || rawTag)
    if (normalized.length >= 2 && normalized.length <= 8) {
      tagSet.add(normalized)
    }
  }

  return Array.from(tagSet).sort()
}

export default function TagsPanel({ question }: { question: TagSourceQuestion }) {
  const [customTags, setCustomTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setCustomTags([])
    setTagInput('')
    setError(null)

    async function load() {
      try {
        const response = await fetch(`/api/questions/${question.id}/tags`, {
          method: 'GET',
          credentials: 'include',
        })
        if (response.status === 401 || !response.ok) return
        const data = await response.json()
        if (!cancelled && data.success && Array.isArray(data.tags)) {
          setCustomTags(data.tags)
        }
      } catch (err) {
        console.error('Error loading tags:', err)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [question.id])

  async function saveTags(nextTags: string[]) {
    const normalizedTags = Array.from(new Set(nextTags.map(normalizeTag).filter(Boolean))).slice(0, 20)
    setCustomTags(normalizedTags)
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/questions/${question.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tags: normalizedTags }),
      })
      if (!response.ok) throw new Error('Failed to save tags')
      const data = await response.json()
      if (data.success && Array.isArray(data.tags)) {
        setCustomTags(data.tags)
      }
    } catch (err) {
      console.error('Error saving tags:', err)
      setError(err instanceof Error ? err.message : 'Failed to save tags')
    } finally {
      setSaving(false)
    }
  }

  function handleAddTag(tag: string) {
    const normalizedTag = normalizeTag(tag)
    setTagInput('')
    if (!normalizedTag || customTags.includes(normalizedTag)) return
    saveTags([...customTags, normalizedTag])
  }

  const suggestedTags = getSuggestedTags(question).filter((tag) => !customTags.includes(tag))

  return (
    <section className={styles.tagsPanel} aria-label="Question tags">
      <div className={styles.tagsHeader}>
        <span>Tags</span>
        {saving && <span className={styles.tagsSaving}>Saving...</span>}
      </div>

      {customTags.length > 0 ? (
        <div className={styles.tagList}>
          {customTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.tagChip}
              onClick={() => saveTags(customTags.filter((item) => item !== tag))}
              title={`Remove ${tag}`}
            >
              {tag}
              <span aria-hidden="true">x</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.noTags}>No custom tags yet.</div>
      )}

      {suggestedTags.length > 0 && (
        <div className={styles.suggestedTags}>
          {suggestedTags.slice(0, 12).map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.suggestedTagButton}
              onClick={() => handleAddTag(tag)}
            >
              + {tag}
            </button>
          ))}
        </div>
      )}

      <form
        className={styles.tagForm}
        onSubmit={(event) => {
          event.preventDefault()
          handleAddTag(tagInput)
        }}
      >
        <input
          className={styles.tagInput}
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          placeholder="Add tag, e.g. FI or SAR"
          maxLength={32}
        />
        <button type="submit" className={styles.addTagButton} disabled={!tagInput.trim() || saving}>
          Add
        </button>
      </form>

      {error && <div className={styles.tagsError}>{error}</div>}
    </section>
  )
}
