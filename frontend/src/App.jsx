import { useEffect, useState } from 'react'
import AppLayout from './components/layout/AppLayout'
import HabitForm from './components/HabitForm'
import AuthPage from './components/auth/AuthPage'
import { supabase } from './lib/supabaseClient'
import {
  getHabits,
  updateHabit,
  deleteHabit,
  logHabitCompletionToday,
} from './services/habitsApi'
import { setAuthToken } from './services/apiClient'

function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [habits, setHabits] = useState([])
  const [loadingHabits, setLoadingHabits] = useState(true)
  const [error, setError] = useState(null)

  // Editing state
  const [editingHabitId, setEditingHabitId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '' })

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

        const { data: listener } = supabase.auth.onAuthStateChange(
          (_event, newSession) => {
            setSession(newSession)
            setAuthToken(newSession?.access_token ?? null)
          }
        )

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

  // --- Editing helpers ---

  function startEdit(habit) {
    setEditingHabitId(habit.id)
    setEditForm({
      name: habit.name,
      description: habit.description || '',
    })
  }

  function cancelEdit() {
    setEditingHabitId(null)
    setEditForm({ name: '', description: '' })
  }

  async function handleHabitUpdated(e, habitId) {
    e.preventDefault()

    if (!editForm.name.trim()) {
      return
    }

    try {
      const updated = await updateHabit(habitId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
      })

      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, ...updated } : h))
      )

      cancelEdit()
    } catch (err) {
      console.error('[Habits] update error:', err.message)
      alert('Failed to update habit.')
    }
  }

  async function handleHabitDeleted(habitId) {
    if (!window.confirm('Delete this habit?')) return

    try {
      await deleteHabit(habitId)
      setHabits((prev) => prev.filter((h) => h.id !== habitId))
    } catch (err) {
      console.error('[Habits] delete error:', err.message)
      alert('Failed to delete habit.')
    }
  }

  async function handleHabitCompleted(habitId) {
    try {
      await logHabitCompletionToday(habitId)
      // For now just inform the user; later you can update streaks/log counts.
      alert('Habit marked as completed for today.')
    } catch (err) {
      console.error('[Habits] completion error:', err.message)
      alert('Failed to log completion.')
    }
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
              {habits.map((habit) => {
                const isEditing = editingHabitId === habit.id

                return (
                  <div className="col-12 col-md-6 col-lg-4" key={habit.id}>
                    <div className="card h-100 border-0 shadow-sm habit-card">
                      <div className="card-body">
                        {isEditing ? (
                          <form onSubmit={(e) => handleHabitUpdated(e, habit.id)}>
                            <div className="mb-2">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={editForm.name}
                                onChange={(e) =>
                                  setEditForm((f) => ({ ...f, name: e.target.value }))
                                }
                                placeholder="Habit name"
                                required
                              />
                            </div>
                            <div className="mb-2">
                              <textarea
                                className="form-control form-control-sm"
                                value={editForm.description}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    description: e.target.value,
                                  }))
                                }
                                placeholder="Description (optional)"
                                rows={2}
                              />
                            </div>
                            <div className="d-flex justify-content-end gap-2">
                              <button
                                type="button"
                                className="btn btn-light btn-sm"
                                onClick={cancelEdit}
                              >
                                Cancel
                              </button>
                              <button type="submit" className="btn btn-primary btn-sm">
                                Save
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <h2 className="h5 mb-1">{habit.name}</h2>
                            {habit.description && (
                              <p className="text-muted small mb-3">
                                {habit.description}
                              </p>
                            )}

                            <div className="d-flex justify-content-between align-items-center">
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm"
                                onClick={() => handleHabitCompleted(habit.id)}
                              >
                                Mark done today
                              </button>

                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={() => startEdit(habit)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => handleHabitDeleted(habit.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </AppLayout>
  )
}

export default App
