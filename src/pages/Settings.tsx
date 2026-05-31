import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert']
const CATEGORY_OPTIONS = [
  'general',
  'academic',
  'business',
  'science',
  'literature',
  'technology',
  'medicine',
  'law',
]

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

export function SettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const [wordsPerDay, setWordsPerDay] = useState(profile?.words_per_day ?? 5)
  const [level, setLevel] = useState(profile?.level ?? 'intermediate')
  const [categories, setCategories] = useState<string[]>(profile?.categories ?? ['general'])
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'UTC')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }

  const handleSave = async () => {
    if (!profile) return
    if (categories.length === 0) {
      setError('Select at least one category')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          words_per_day: wordsPerDay,
          level,
          categories,
          timezone,
        })
        .eq('user_id', profile.user_id)

      if (updateError) throw updateError
      await refreshProfile()
      setMessage('Settings saved successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Customize your vocabulary learning experience</p>
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-surface-elevated p-5 space-y-5">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Words per day</label>
          <input
            type="number"
            min={1}
            max={20}
            value={wordsPerDay}
            onChange={(e) => setWordsPerDay(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-slate-100"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">Categories</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  categories.includes(cat)
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-slate-100"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}
        {message && (
          <div className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}
