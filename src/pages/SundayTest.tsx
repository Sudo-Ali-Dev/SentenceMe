import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { WordCard } from '../components/WordCard'
import { fetchWeekWords, fetchWeakCarryovers, gradeSentence } from '../lib/words'
import { getWeekStartInTimezone } from '../lib/dates'
import type { Word, GradeResult } from '../lib/types'

export function SundayTestPage() {
  const { profile, user } = useAuth()
  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sentences, setSentences] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, GradeResult>>({})
  const [grading, setGrading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)

  const loadWords = useCallback(async () => {
    if (!profile || !user) return
    setLoading(true)
    try {
      const weekStart = getWeekStartInTimezone(profile.timezone)
      const [weekWords, carryovers] = await Promise.all([
        fetchWeekWords(user.id, weekStart),
        fetchWeakCarryovers(user.id, weekStart),
      ])

      const seen = new Set<string>()
      const combined: Word[] = []
      for (const w of [...weekWords, ...carryovers]) {
        if (!seen.has(w.id)) {
          seen.add(w.id)
          combined.push(w)
        }
      }
      setWords(combined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load words')
    } finally {
      setLoading(false)
    }
  }, [profile, user])

  useEffect(() => {
    loadWords()
  }, [loadWords])

  const currentWord = words[currentIndex]
  const allGraded = words.length > 0 && words.every((w) => results[w.id])

  const handleSubmit = async () => {
    if (!currentWord) return
    const sentence = sentences[currentWord.id] ?? ''
    if (!sentence.trim()) return

    setGrading(true)
    setError('')
    try {
      const result = await gradeSentence(currentWord, sentence, 'sunday')
      setResults((prev) => ({ ...prev, [currentWord.id]: result }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed')
    } finally {
      setGrading(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((i) => i + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (completed || allGraded) {
    const correct = Object.values(results).filter((r) => r.is_correct).length
    return (
      <div className="text-center">
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-8">
          <h1 className="text-2xl font-bold text-purple-300">Sunday Test Complete!</h1>
          <p className="mt-2 text-slate-300">
            {correct} of {words.length} correct. Weak words will be recycled into your daily pool.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="text-center">
        <p className="text-slate-400">No words for this week&apos;s test yet.</p>
        <Link to="/" className="mt-4 inline-block text-brand-400 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Sunday Test</h1>
        <p className="text-slate-400">
          Review {words.length} words from this week and carryovers
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {currentWord && (
        <WordCard
          word={currentWord}
          sentence={sentences[currentWord.id] ?? ''}
          onSentenceChange={(v) =>
            setSentences((prev) => ({ ...prev, [currentWord.id]: v }))
          }
          onSubmit={handleSubmit}
          grading={grading}
          result={results[currentWord.id] ?? null}
          index={currentIndex}
          total={words.length}
        />
      )}

      {results[currentWord?.id ?? ''] && currentIndex < words.length - 1 && (
        <button
          onClick={handleNext}
          className="w-full rounded-lg bg-slate-700 py-2.5 font-medium text-white hover:bg-slate-600"
        >
          Next word →
        </button>
      )}

      {allGraded && (
        <button
          onClick={() => setCompleted(true)}
          className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-500"
        >
          Finish Sunday test
        </button>
      )}
    </div>
  )
}
