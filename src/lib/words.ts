import { supabase, invokeFunction } from './supabase'
import type { GeneratedWord, GradeResult, Word, Profile } from './types'
import { getTodayInTimezone, getWeekStartInTimezone } from './dates'
import { isDueForReview } from './mastery'

export async function fetchAllUserTerms(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('words')
    .select('term')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((w) => w.term.toLowerCase())
}

export async function fetchDueWords(userId: string, today: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'learning')
    .lte('next_review_date', today)

  if (error) throw error
  return data ?? []
}

export async function fetchTodayNewWords(userId: string, today: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .eq('added_date', today)

  if (error) throw error
  return data ?? []
}

export async function generateWords(
  profile: Profile,
  count: number,
  exclude: string[],
): Promise<Word[]> {
  const result = await invokeFunction<{ words: GeneratedWord[] }>('generate-words', {
    count,
    level: profile.level,
    categories: profile.categories,
    exclude,
  })
  return result.words as Word[]
}

export async function buildDailyPool(profile: Profile): Promise<Word[]> {
  const today = getTodayInTimezone(profile.timezone)

  let todayWords = await fetchTodayNewWords(profile.user_id, today)
  const dueWords = await fetchDueWords(profile.user_id, today)

  const dueNotInToday = dueWords.filter(
    (d) => !todayWords.some((t) => t.id === d.id),
  )

  const pool = [...dueNotInToday, ...todayWords]
  const needed = profile.words_per_day - pool.length

  if (needed > 0) {
    const existingTerms = await fetchAllUserTerms(profile.user_id)
    await generateWords(profile, needed, existingTerms)
    todayWords = await fetchTodayNewWords(profile.user_id, today)
    return [...dueNotInToday, ...todayWords]
  }

  return pool.slice(0, profile.words_per_day + dueNotInToday.length)
}

export async function gradeSentence(
  word: Word,
  sentence: string,
  context: 'daily' | 'sunday' | 'review',
): Promise<GradeResult> {
  return invokeFunction<GradeResult>('grade-sentence', {
    word_id: word.id,
    term: word.term,
    definition: word.definition,
    sentence,
    context,
  })
}

export async function fetchWeekWords(userId: string, weekStart: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)

  if (error) throw error
  return data ?? []
}

export async function fetchWeakCarryovers(userId: string, weekStart: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'learning')
    .lt('week_start', weekStart)

  if (error) throw error
  return (data ?? []).filter((w) => w.mastery < 2)
}

export async function insertCustomWords(
  userId: string,
  words: GeneratedWord[],
  timezone: string,
): Promise<Word[]> {
  const today = getTodayInTimezone(timezone)
  const weekStart = getWeekStartInTimezone(timezone)

  const rows = words.map((w) => ({
    user_id: userId,
    term: w.term,
    definition: w.definition,
    part_of_speech: w.part_of_speech,
    example: w.example,
    source: 'custom' as const,
    week_start: weekStart,
    added_date: today,
    mastery: 0,
    times_correct: 0,
    times_incorrect: 0,
    status: 'learning' as const,
    next_review_date: today,
  }))

  const { data, error } = await supabase.from('words').insert(rows).select('*')
  if (error) throw error
  return data ?? []
}

export async function fillCustomWordsWithAI(
  profile: Profile,
  terms: string[],
): Promise<GeneratedWord[]> {
  const existingTerms = await fetchAllUserTerms(profile.user_id)
  const result = await invokeFunction<{ words: GeneratedWord[] }>('generate-words', {
    count: terms.length,
    level: profile.level,
    categories: profile.categories,
    exclude: existingTerms,
    custom_terms: terms,
    insert: false,
  })
  return result.words
}

export { isDueForReview }
