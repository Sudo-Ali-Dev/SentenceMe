import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, profileLoading, profileError, refreshProfile } =
    useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Checking session…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  if (profileLoading || (!profile && !profileError)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Loading your profile…</p>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-200">Setup required</h2>
          <p className="mt-2 text-sm text-red-100/90">{profileError}</p>
          <p className="mt-3 text-sm text-slate-400">
            Run the SQL migration in Supabase (SQL Editor → paste{' '}
            <code className="text-slate-300">supabase/migrations/20250531000000_initial_schema.sql</code>
            ).
          </p>
          <button
            type="button"
            onClick={() => refreshProfile()}
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
