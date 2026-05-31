import { supabase } from './supabase'
import type { Profile } from './types'
import { getTodayInTimezone, isYesterday, addDaysToDate } from './dates'
import { withTimeout } from './async'

function toProfileError(err: { message: string; code?: string }): Error {
  const msg = err.message ?? ''
  if (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    err.code === '42P01' ||
    err.code === 'PGRST205'
  ) {
    return new Error(
      'Database tables are missing. In Supabase, open SQL Editor and run supabase/migrations/20250531000000_initial_schema.sql',
    )
  }
  if (err.code === '42501') {
    return new Error('Permission denied loading profile. Check that you are signed in.')
  }
  return new Error(msg || 'Could not load profile')
}

export async function ensureProfile(userId: string): Promise<Profile> {
  const load = async (): Promise<Profile> => {
    const { data: existing, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (selectError) throw toProfileError(selectError)
    if (existing) return existing as Profile

    const { data, error: insertError } = await supabase
      .from('profiles')
      .insert({ user_id: userId })
      .select('*')
      .single()

    if (insertError) {
      // Profile may exist from signup trigger; fetch again
      if (insertError.code === '23505') {
        const { data: retry, error: retryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
        if (retryError) throw toProfileError(retryError)
        return retry as Profile
      }
      throw toProfileError(insertError)
    }

    return data as Profile
  }

  return withTimeout(
    load(),
    12_000,
    'Profile request timed out. Check your Supabase project is active (not paused) and your internet connection.',
  )
}

export async function updateStreak(profile: Profile): Promise<Profile> {
  const today = getTodayInTimezone(profile.timezone)

  if (profile.last_active_date === today) {
    return profile
  }

  let newStreak = 1
  if (profile.last_active_date && isYesterday(profile.last_active_date, today)) {
    newStreak = profile.current_streak + 1
  }

  const longest = Math.max(profile.longest_streak, newStreak)

  const { data, error } = await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: longest,
      last_active_date: today,
    })
    .eq('user_id', profile.user_id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function completeDailySession(
  userId: string,
  date: string,
  wordIds: string[],
  profile: Profile,
): Promise<{ sessionId: string; profile: Profile }> {
  const { data: existing } = await supabase
    .from('daily_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  let sessionId: string

  if (existing) {
    const { data, error } = await supabase
      .from('daily_sessions')
      .update({
        completed_at: new Date().toISOString(),
        word_ids: wordIds,
      })
      .eq('id', existing.id)
      .select('id')
      .single()
    if (error) throw error
    sessionId = data.id
  } else {
    const { data, error } = await supabase
      .from('daily_sessions')
      .insert({
        user_id: userId,
        date,
        completed_at: new Date().toISOString(),
        word_ids: wordIds,
      })
      .select('id')
      .single()
    if (error) throw error
    sessionId = data.id
  }

  const updatedProfile = await updateStreak(profile)
  return { sessionId, profile: updatedProfile }
}

export async function getCompletedSessionDates(
  userId: string,
  since: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('daily_sessions')
    .select('date')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .gte('date', since)

  if (error) throw error
  return (data ?? []).map((s) => s.date)
}

export async function getTodaySession(userId: string, date: string) {
  const { data } = await supabase
    .from('daily_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  return data
}

export async function getWeekSundayTestDone(
  userId: string,
  weekStart: string,
): Promise<boolean> {
  const sundayDate = addDaysToDate(weekStart, 6)

  const { count } = await supabase
    .from('attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('context', 'sunday')
    .gte('created_at', `${sundayDate}T00:00:00`)

  return (count ?? 0) > 0
}
