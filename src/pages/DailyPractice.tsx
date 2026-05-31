import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { WordCard } from '../components/WordCard'
import { buildDailyPool, gradeSentence } from '../lib/words'
import { completeDailySession } from '../lib/sessions'
import { getTodayInTimezone } from '../lib/dates'
import type { Word, GradeResult } from '../lib/types'

export function DailyPracticePage() {
  const { profile, user, refreshProfile } = useAuth()
  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sentences, setSentences] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, GradeResult>>({})
  const [grading, setGrading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)

  const loadWords = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const pool = await buildDailyPool(profile)
      setWords(pool)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load words')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    loadWords()
  }, [loadWords])

  const currentWord = words[currentIndex]
  const allGraded = words.length > 0 && words.every((w) => results[w.id])

  const handleSubmit = async () => {
    if (!currentWord || !profile) return
    const sentence = sentences[currentWord.id] ?? ''
    if (!sentence.trim()) return

    setGrading(true)
    setError('')
    try {
      const result = await gradeSentence(currentWord, sentence, 'daily')
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

  const handleComplete = async () => {
    if (!profile || !user) return
    const today = getTodayInTimezone(profile.timezone)
    try {
      await completeDailySession(
        user.id,
        today,
        words.map((w) => w.id),
        profile,
      )
      await refreshProfile()
      setCompleted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (completed) {
    return (
      <div className="text-center">
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-8">
          <h1 className="text-2xl font-bold text-green-400">Session Complete!</h1>
          <p className="mt-2 text-slate-300">
            You practiced {words.length} words today. Keep the streak going!
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
        <p className="text-slate-400">No words available. Check your settings or try again.</p>
        <button
          onClick={loadWords}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-500"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Daily Practice</h1>
        <p className="text-slate-400">
          Write a sentence for each word to build your vocabulary
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
          onClick={handleComplete}
          className="w-full rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-500"
        >
          Complete session
        </button>
      )}
    </div>
  )
}
