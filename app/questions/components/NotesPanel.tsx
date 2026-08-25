'use client'

/**
 * Per-question personal study note. Self-contained per questionId.
 */

import { useEffect, useState } from 'react'
import styles from '../page.module.css'

export default function NotesPanel({ questionId }: { questionId: number }) {
  const [noteDraft, setNoteDraft] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setNoteDraft('')
    setSavedAt(null)
    setError(null)

    async function load() {
      try {
        const response = await fetch(`/api/questions/${questionId}/note`, {
          method: 'GET',
          credentials: 'include',
        })
        if (response.status === 401 || !response.ok) return
        const data = await response.json()
        if (!cancelled && data.success) {
          setNoteDraft(data.note?.content || '')
          setSavedAt(data.note?.updated_at || null)
        }
      } catch (err) {
        console.error('Error loading note:', err)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [questionId])

  async function saveNote() {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/questions/${questionId}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: noteDraft }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to save note')
      }
      setNoteDraft(data.note?.content || '')
      setSavedAt(data.note?.updated_at || null)
    } catch (err) {
      console.error('Error saving note:', err)
      setError(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={styles.notesPanel} aria-label="Personal study notes">
      <div className={styles.notesHeader}>
        <span>Personal Notes</span>
        {savedAt && <span className={styles.noteSavedAt}>Saved {new Date(savedAt).toLocaleString()}</span>}
      </div>
      <textarea
        className={styles.noteTextarea}
        value={noteDraft}
        onChange={(event) => setNoteDraft(event.target.value)}
        placeholder="Write your own study note for future review..."
        maxLength={5000}
        rows={5}
      />
      <div className={styles.noteActions}>
        <span className={styles.noteCount}>{noteDraft.length} / 5000</span>
        <button type="button" className={styles.saveNoteButton} onClick={saveNote} disabled={saving}>
          {saving ? 'Saving...' : 'Save Note'}
        </button>
      </div>
      {error && <div className={styles.noteError}>{error}</div>}
    </section>
  )
}
