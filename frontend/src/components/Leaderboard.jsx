import { useEffect, useState } from 'react'
import { apiRequest } from '../services/apiClient'

function Leaderboard() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await apiRequest('/leaderboard/friends')
        setEntries(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="alert alert-info">Loading leaderboard…</div>
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>
  }

  if (entries.length === 0) {
    return <p className="text-muted">No friends stats yet.</p>
  }

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-body">
        <h2 className="h5 mb-3">Friends Leaderboard</h2>
        <ol className="mb-0">
          {entries.map((row) => (
            <li key={row.user_id}>
              {row.user_id.slice(0, 8)}… – {row.total_completions} completions
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export default Leaderboard
