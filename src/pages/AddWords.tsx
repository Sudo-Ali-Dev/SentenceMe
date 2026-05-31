import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  insertCustomWords,
  fillCustomWordsWithAI,
} from '../lib/words'
import type { GeneratedWord } from '../lib/types'

export function AddWordsPage() {
  const { profile, user } = useAuth()
  const [input, setInput] = useState('')
  const [useAI, setUseAI] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preview, setPreview] = useState<GeneratedWord[]>([])

  const parseTerms = (): string[] =>
    input
      .split(/[\n,]+/)
      .map((t) => t.trim())
      .filter(Boolean)

  const handlePreview = async () => {
    if (!profile) return
    const terms = parseTerms()
    if (terms.length === 0) {
      setError('Enter at least one word')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (useAI) {
        const filled = await fillCustomWordsWithAI(profile, terms)
        setPreview(filled)
      } else {
        setPreview(
          terms.map((term) => ({
            term,
            definition: '',
            part_of_speech: 'noun',
            example: '',
          })),
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate definitions')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile || !user || preview.length === 0) return

    const invalid = preview.filter((w) => !w.definition.trim())
    if (invalid.length > 0) {
      setError('All words need definitions. Use AI fill or add definitions manually.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await insertCustomWords(user.id, preview, profile.timezone)
      setSuccess(`Added ${preview.length} word(s) successfully!`)
      setInput('')
      setPreview([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save words')
    } finally {
      setLoading(false)
    }
  }

  const updatePreview = (index: number, field: keyof GeneratedWord, value: string) => {
    setPreview((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Add Words</h1>
        <p className="text-slate-400">Paste custom vocabulary words to learn</p>
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-surface-elevated p-5 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-400">
            Words (one per line or comma-separated)
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
            placeholder="ephemeral&#10;ubiquitous&#10;serendipity"
            className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            className="rounded border-slate-600"
          />
          Fill definitions and examples with AI
        </label>

        <button
          onClick={handlePreview}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : useAI ? 'Generate with AI' : 'Preview words'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">{success}</div>
      )}

      {preview.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-white">Preview ({preview.length} words)</h2>
          {preview.map((word, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-700/60 bg-surface-elevated p-4 space-y-2"
            >
              <input
                value={word.term}
                onChange={(e) => updatePreview(i, 'term', e.target.value)}
                className="w-full rounded border border-slate-600 bg-surface px-2 py-1 font-bold text-white"
              />
              <input
                value={word.part_of_speech}
                onChange={(e) => updatePreview(i, 'part_of_speech', e.target.value)}
                placeholder="Part of speech"
                className="w-full rounded border border-slate-600 bg-surface px-2 py-1 text-sm text-slate-300"
              />
              <textarea
                value={word.definition}
                onChange={(e) => updatePreview(i, 'definition', e.target.value)}
                placeholder="Definition"
                rows={2}
                className="w-full rounded border border-slate-600 bg-surface px-2 py-1 text-sm text-slate-300"
              />
              <textarea
                value={word.example}
                onChange={(e) => updatePreview(i, 'example', e.target.value)}
                placeholder="Example sentence"
                rows={2}
                className="w-full rounded border border-slate-600 bg-surface px-2 py-1 text-sm text-slate-500"
              />
            </div>
          ))}
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            Save words
          </button>
        </div>
      )}
    </div>
  )
}
