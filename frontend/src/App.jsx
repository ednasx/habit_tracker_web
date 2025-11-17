import { useEffect, useState } from 'react'
import Navbar from './components/layout/Navbar'
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
        // Expecting an array from backend, e.g. [{ id, name, description }]
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

  return (
    <div>
      <Navbar />
      <main style={{ padding: '1rem' }}>
        <h1>Habit Tracker Dashboard</h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          This page shows your habits fetched from the backend API.
        </p>

        {loading && <p>Loading habits...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {!loading && !error && habits.length === 0 && (
          <p>No habits found yet. Try adding some via the backend.</p>
        )}

        {!loading && !error && habits.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {habits.map((habit) => (
              <li
                key={habit.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                }}
              >
                <strong>{habit.name}</strong>
                {habit.description && (
                  <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '0.25rem' }}>
                    {habit.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default App
