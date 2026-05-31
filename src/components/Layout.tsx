import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/practice', label: 'Practice' },
  { to: '/add-words', label: 'Add Words' },
  { to: '/settings', label: 'Settings' },
]

export function Layout() {
  const { signOut, profile } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-700/50 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-brand-400">SentenceMe</span>
            {profile && profile.current_streak > 0 && (
              <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-300">
                🔥 {profile.current_streak}
              </span>
            )}
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4 pb-2">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600/30 text-brand-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
