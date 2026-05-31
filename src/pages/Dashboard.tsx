import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { StreakHeatmap } from '../components/StreakHeatmap'
import {
  getCompletedSessionDates,
  getTodaySession,
  getWeekSundayTestDone,
} from '../lib/sessions'
import { getTodayInTimezone, getWeekStartInTimezone, isSundayInTimezone } from '../lib/dates'
import { subDays, format, parseISO } from 'date-fns'

export function DashboardPage() {
  const { profile, user } = useAuth()
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set())
  const [todayDone, setTodayDone] = useState(false)
  const [sundayAvailable, setSundayAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!profile || !user) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const today = getTodayInTimezone(profile.timezone)
        const since = format(subDays(parseISO(today), 84), 'yyyy-MM-dd')

        const [dates, session, sundayDone] = await Promise.all([
          getCompletedSessionDates(user.id, since),
          getTodaySession(user.id, today),
          getWeekSundayTestDone(user.id, getWeekStartInTimezone(profile.timezone)),
        ])

        setCompletedDates(new Set(dates))
        setTodayDone(Boolean(session?.completed_at))
        setSundayAvailable(isSundayInTimezone(profile.timezone) && !sundayDone)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [profile, user])

  if (!profile) return null

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {loadError}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Track your vocabulary journey</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Current streak" value={profile.current_streak} suffix="days" />
        <StatCard label="Longest streak" value={profile.longest_streak} suffix="days" />
        <StatCard label="Words per day" value={profile.words_per_day} />
      </div>

      {sundayAvailable && (
        <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 p-4">
          <h2 className="font-semibold text-purple-200">Sunday Test Available</h2>
          <p className="mt-1 text-sm text-purple-300/80">
            Review all words from this week plus any carryovers.
          </p>
          <Link
            to="/sunday-test"
            className="mt-3 inline-block rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
          >
            Start Sunday Test
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-slate-700/60 bg-surface-elevated p-5">
        <h2 className="mb-4 font-semibold text-white">Activity</h2>
        <StreakHeatmap completedDates={completedDates} timezone={profile.timezone} />
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-surface-elevated p-5">
        <h2 className="mb-2 font-semibold text-white">Today&apos;s Practice</h2>
        {todayDone ? (
          <p className="text-green-400">✓ You completed today&apos;s session. Great work!</p>
        ) : (
          <>
            <p className="mb-3 text-slate-400">
              {profile.words_per_day} words waiting for you today.
            </p>
            <Link
              to="/practice"
              className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-500"
            >
              Start today&apos;s practice
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string
  value: number
  suffix?: string
}) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-surface-elevated p-4 text-center">
      <p className="text-3xl font-bold text-brand-400">{value}</p>
      {suffix && <p className="text-xs text-slate-500">{suffix}</p>}
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  )
}
