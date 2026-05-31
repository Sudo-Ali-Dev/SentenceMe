import { format, startOfWeek, subDays, parseISO, isSunday } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export function getTodayInTimezone(timezone: string): string {
  const now = toZonedTime(new Date(), timezone)
  return format(now, 'yyyy-MM-dd')
}

export function getWeekStartInTimezone(timezone: string, dateStr?: string): string {
  const base = dateStr ? parseISO(dateStr) : toZonedTime(new Date(), timezone)
  const weekStart = startOfWeek(base, { weekStartsOn: 0 })
  return format(weekStart, 'yyyy-MM-dd')
}

export function isSundayInTimezone(timezone: string): boolean {
  const now = toZonedTime(new Date(), timezone)
  return isSunday(now)
}

export function formatDisplayDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy')
}

export function getHeatmapDates(days: number, timezone: string): string[] {
  const today = toZonedTime(new Date(), timezone)
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    dates.push(format(subDays(today, i), 'yyyy-MM-dd'))
  }
  return dates
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = parseISO(dateStr)
  d.setDate(d.getDate() + days)
  return format(d, 'yyyy-MM-dd')
}

export function isYesterday(dateStr: string, todayStr: string): boolean {
  const today = parseISO(todayStr)
  const yesterday = subDays(today, 1)
  return format(yesterday, 'yyyy-MM-dd') === dateStr
}
