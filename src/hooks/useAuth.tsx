import { useEffect, useState, createContext, useContext, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ensureProfile } from '../lib/sessions'
import type { Profile } from '../lib/types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  profileError: string | null
  profileLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const loadProfile = async (userId: string) => {
    setProfileLoading(true)
    setProfileError(null)
    try {
      const p = await ensureProfile(userId)
      setProfile(p)
    } catch (err) {
      console.error('Failed to load profile:', err)
      setProfile(null)
      const message =
        err instanceof Error ? err.message : 'Could not load your profile'
      setProfileError(message)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const applySession = (s: Session | null) => {
      if (!mounted) return
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        void loadProfile(s.user.id)
      } else {
        setProfile(null)
        setProfileError(null)
      }
    }

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        applySession(s)
      })
      .catch((err) => {
        console.error('getSession failed:', err)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      applySession(s)
      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileError,
        profileLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
