import { getHeatmapDates } from '../lib/dates'

interface StreakHeatmapProps {
  completedDates: Set<string>
  timezone: string
  days?: number
}

export function StreakHeatmap({ completedDates, timezone, days = 84 }: StreakHeatmapProps) {
  const dates = getHeatmapDates(days, timezone)
  const weeks: string[][] = []

  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7))
  }

  const level = (date: string) => (completedDates.has(date) ? 4 : 0)

  const colors = [
    'bg-slate-800',
    'bg-brand-900',
    'bg-brand-700',
    'bg-brand-500',
    'bg-brand-400',
  ]

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((date) => (
              <div
                key={date}
                title={date}
                className={`h-3 w-3 rounded-sm ${colors[level(date)]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <span>Less</span>
        {colors.map((c, i) => (
          <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
