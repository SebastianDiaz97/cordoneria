import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, unwrap } from '@/lib/supabase'
import type { Profile } from '@/types'
import { AuthContext, type AuthValue } from './context'

function translateAuthError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials'))
    return 'Correo o contraseña incorrectos.'
  if (lower.includes('email not confirmed'))
    return 'Debes confirmar tu correo antes de ingresar.'
  if (lower.includes('too many requests'))
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
  if (lower.includes('failed to fetch') || lower.includes('network'))
    return 'No se pudo conectar con Supabase. Revisa tu conexión.'
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const data = await unwrap<Profile | null>(
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      )
      setProfile(data)
      setProfileError(null)
    } catch (error) {
      setProfile(null)
      setProfileError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el perfil del usuario.',
      )
    }
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession)
        if (!nextSession) {
          setProfile(null)
          setLoadedUserId(null)
          setSessionLoading(false)
        }
      },
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const userId = session?.user.id
    if (!userId || loadedUserId === userId) return
    let active = true
    async function load() {
      await loadProfile(userId as string)
      if (active) setLoadedUserId(userId as string)
    }
    void load()
    return () => {
      active = false
    }
  }, [session?.user.id, loadedUserId, loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(translateAuthError(error.message))
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setLoadedUserId(null)
  }, [])

  async function refreshProfile() {
    if (!session?.user.id) return
    await loadProfile(session.user.id)
    setLoadedUserId(session.user.id)
  }

  const loading =
    sessionLoading || (session !== null && loadedUserId !== session.user.id)

  const value: AuthValue = {
    session,
    profile,
    loading,
    profileError,
    isAdmin: profile?.role === 'admin' && profile.is_active,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
