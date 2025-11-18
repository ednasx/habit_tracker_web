import { useEffect, useState } from 'react'
import AppLayout from './components/layout/AppLayout'
import HabitForm from './components/HabitForm'
import AuthPage from './components/auth/AuthPage'
import { supabase } from './lib/supabaseClient'
import { getHabits } from './services/habitsApi'
import { setAuthToken } from './services/apiClient'

function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [habits, setHabits] = useState([])
  const [loadingHabits, setLoadingHabits] = useState(true)
  const [error, setError] = useState(null)

  // Initialize auth & listen for changes
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

        const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
          setSession(newSession)
          setAuthToken(newSession?.access_token ?? null)
        })

        subscription = listener.subscription
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

  // Load habits when user is authenticated
  useEffect(() => {
    if (!session) {
      setHabits([])
      return
    }

    async function fetchHabits() {
      try {
        setLoadingHabits(true)
        setError(null)

        const data = await getHabits()
        setHabits(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('[Habits] fetch error:', err.message)
        setError('Could not load habits. Is the backend running and auth configured?')
      } finally {
        setLoadingHabits(false)
      }
    }

    fetchHabits()
  }, [session])

  function handleHabitCreated(newHabit) {
    setHabits((prev) => [newHabit, ...prev])
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  // While we check auth
  if (authLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border mb-3" role="status" />
          <p className="text-muted mb-0">Checking your session…</p>
        </div>
      </div>
    )
  }

  // Not logged in → show auth page
  if (!session) {
    return <AuthPage />
  }

  // Logged in → show dashboard
  return (
    <AppLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Dashboard</h1>
          <p className="text-muted mb-0">
            Track your daily habits, stay consistent, and watch your streaks grow.
          </p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={handleSignOut}>
          Sign out
        </button>
      </div>

      <HabitForm onHabitCreated={handleHabitCreated} />

      {loadingHabits && (
        <div className="alert alert-info" role="alert">
          Loading habits...
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {!loadingHabits && !error && (
        <>
          {habits.length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <h2 className="h5 mb-2">No habits yet</h2>
                <p className="text-muted mb-3">
                  Use the form above to create your first habit.
                </p>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              {habits.map((habit) => (
                <div className="col-12 col-md-6 col-lg-4" key={habit.id}>
                  <div className="card h-100 border-0 shadow-sm habit-card">
                    <div className="card-body">
                      <h2 className="h5 mb-1">{habit.name}</h2>
                      {habit.description && (
                        <p className="text-muted small mb-3">{habit.description}</p>
                      )}
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="badge bg-primary-subtle text-primary-emphasis">
                          Streak: 0 days
                        </span>
                        <span className="text-muted small">Logs: 0</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppLayout>
  )
}

export default App
