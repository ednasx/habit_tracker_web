import { useEffect, useState } from 'react'
import Navbar from './components/layout/Navbar'
import HabitForm from './components/HabitForm'
import { getHabits } from './services/habitsApi'

function App() {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchHabits() {
      try {
        setLoading(true)
        setError(null)

        const data = await getHabits()
        setHabits(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        setError('Could not load habits. Is the backend running?')
      } finally {
        setLoading(false)
      }
    }

    fetchHabits()
  }, [])

  function handleHabitCreated(newHabit) {
    // Prepend the new habit to the list
    setHabits((prev) => [newHabit, ...prev])
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />

      <main className="flex-grow-1 py-4">
        <div className="container">
          {/* Heading area */}
          <div className="row mb-4">
            <div className="col-12 col-lg-8">
              <h1 className="h3 fw-bold mb-1">Dashboard</h1>
              <p className="text-muted mb-0">
                Track your daily habits, stay consistent, and watch your streaks grow.
              </p>
            </div>
          </div>

          {/* Create habit form */}
          <HabitForm onHabitCreated={handleHabitCreated} />

          {/* Status / alerts */}
          {loading && (
            <div className="alert alert-info" role="alert">
              Loading habits...
            </div>
          )}

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Habits list */}
          {!loading && !error && (
            <>
              {habits.length === 0 ? (
                <div className="card border-0 shadow-sm">
                  <div className="card-body text-center py-5">
                    <h2 className="h5 mb-2">No habits yet</h2>
                    <p className="text-muted mb-3">
                      Use the form above to create your first habit.
                    </p>
                    <p className="small text-muted mb-0">
                      Backend endpoint expected: <code>GET /api/habits</code>,{' '}
                      <code>POST /api/habits</code>
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
                            <p className="text-muted small mb-3">
                              {habit.description}
                            </p>
                          )}

                          {/* Placeholder for future stats */}
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
        </div>
      </main>

      {/* Simple footer */}
      <footer className="py-3 mt-auto border-top bg-white">
        <div className="container d-flex justify-content-between align-items-center">
          <span className="text-muted small">
            Design of Dynamic Web Systems — Team Habit Tracker
          </span>
          <span className="text-muted small d-none d-sm-inline">
            Frontend: React &amp; Bootstrap
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
