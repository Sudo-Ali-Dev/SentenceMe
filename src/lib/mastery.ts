import type { Word } from './types'
import { addDaysToDate } from './dates'

export const MASTERY_THRESHOLD = 3

export function computeMasteryUpdate(
  word: Word,
  isCorrect: boolean,
  today: string,
): Partial<Word> {
  if (isCorrect) {
    const newMastery = Math.min(MASTERY_THRESHOLD, word.mastery + 1)
    const mastered = newMastery >= MASTERY_THRESHOLD
    return {
      mastery: newMastery,
      times_correct: word.times_correct + 1,
      status: mastered ? 'mastered' : 'learning',
      next_review_date: mastered ? null : addDaysToDate(today, spacedInterval(newMastery)),
      learned_at: mastered ? new Date().toISOString() : word.learned_at,
    }
  }

  const newMastery = Math.max(0, word.mastery - 1)
  return {
    mastery: newMastery,
    times_incorrect: word.times_incorrect + 1,
    status: 'learning',
    next_review_date: addDaysToDate(today, spacedInterval(newMastery)),
    learned_at: null,
  }
}

function spacedInterval(mastery: number): number {
  switch (mastery) {
    case 0:
      return 1
    case 1:
      return 2
    case 2:
      return 4
    default:
      return 7
  }
}

export function isDueForReview(word: Word, today: string): boolean {
  if (word.status === 'mastered') return false
  if (!word.next_review_date) return true
  return word.next_review_date <= today
}
