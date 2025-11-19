import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { setAuthToken } from '../services/apiClient'

/**
 * Handles:
 * - Checking the current Supabase session
 * - Listening to auth state changes
 * - Keeping apiClient's Authorization header in sync
 */
export function useAuthSession() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let subscription

    async function initAuth() {
      setAuthLoading(true)
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('[Auth] getSession error:', sessionError.message)
        } else {
          const currentSession = data?.session ?? null
          setSession(currentSession)
          setAuthToken(currentSession?.access_token ?? null)
        }

        const { data: listener } = supabase.auth.onAuthStateChange(
          (_event, newSession) => {
            setSession(newSession)
            setAuthToken(newSession?.access_token ?? null)
          }
        )

        subscription = listener?.subscription
      } finally {
        setAuthLoading(false)
      }
    }

    initAuth()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, authLoading, signOut }
}
