import type { Word, GradeResult } from '../lib/types'

interface WordCardProps {
  word: Word
  sentence: string
  onSentenceChange: (value: string) => void
  onSubmit: () => void
  grading: boolean
  result: GradeResult | null
  disabled?: boolean
  index: number
  total: number
}

export function WordCard({
  word,
  sentence,
  onSentenceChange,
  onSubmit,
  grading,
  result,
  disabled,
  index,
  total,
}: WordCardProps) {
  const canSubmit = sentence.trim().length > 0 && !grading && !result && !disabled

  return (
    <div className="rounded-xl border border-slate-700/60 bg-surface-elevated p-5 shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Word {index + 1} of {total}
          </span>
          <h2 className="mt-1 text-2xl font-bold text-white">{word.term}</h2>
          <span className="text-sm italic text-brand-300">{word.part_of_speech}</span>
        </div>
        <MasteryBadge mastery={word.mastery} status={word.status} />
      </div>

      <p className="mb-2 text-slate-300">{word.definition}</p>
      {word.example && (
        <p className="mb-4 text-sm text-slate-500">
          Example: <em>&ldquo;{word.example}&rdquo;</em>
        </p>
      )}

      {!result ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-400">
            Write a sentence using &ldquo;{word.term}&rdquo;
          </label>
          <textarea
            value={sentence}
            onChange={(e) => onSentenceChange(e.target.value)}
            disabled={disabled || grading}
            rows={3}
            placeholder="Type your sentence here..."
            className="w-full resize-none rounded-lg border border-slate-600 bg-surface px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
          />
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {grading ? 'Grading...' : 'Check sentence'}
          </button>
        </div>
      ) : (
        <div
          className={`rounded-lg p-4 ${
            result.is_correct
              ? 'border border-green-500/30 bg-green-500/10'
              : 'border border-red-500/30 bg-red-500/10'
          }`}
        >
          <p className="font-medium">
            {result.is_correct ? '✓ Correct!' : '✗ Needs improvement'}
          </p>
          <p className="mt-2 text-sm text-slate-300">{result.feedback}</p>
          {result.correction && (
            <p className="mt-2 text-sm text-slate-400">
              Suggestion: <em>&ldquo;{result.correction}&rdquo;</em>
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">Your sentence: &ldquo;{sentence}&rdquo;</p>
        </div>
      )}
    </div>
  )
}

function MasteryBadge({ mastery, status }: { mastery: number; status: string }) {
  if (status === 'mastered') {
    return (
      <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
        Mastered
      </span>
    )
  }
  return (
    <span className="rounded-full bg-slate-700 px-2 py-1 text-xs text-slate-400">
      {mastery}/3
    </span>
  )
}
