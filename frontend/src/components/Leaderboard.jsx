// frontend/src/components/Leaderboard.jsx
import { useEffect, useState } from 'react';
import { getFriendsLeaderboard } from '../services/habitsApi';

function Leaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getFriendsLeaderboard(10);
        setEntries(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[Leaderboard] Error loading leaderboard:', err);
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="alert alert-info">Loading leaderboard…</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (entries.length === 0) {
    return <p className="text-muted">No stats yet for you or your friends.</p>;
  }

  return (
    <div className="card border-0 shadow-sm mt-4 leaderboard-card">
      <div className="card-body">
        <h2 className="h5 mb-3">Friends Leaderboard</h2>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th style={{ width: '3rem' }}>#</th>
                <th>User</th>
                <th className="text-end">Total completions</th>
                <th className="text-end">Current streak</th>
                <th className="text-end">Longest streak</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => {
                const label =
                  row.username ||
                  row.display_name ||
                  `${row.user_id.slice(0, 8)}…`;

                const rowClass = row.is_self ? 'table-primary' : '';

                return (
                  <tr key={row.user_id} className={rowClass}>
                    <td>{row.rank}</td>
                    <td>
                      {label}
                      {row.is_self && (
                        <span className="badge bg-primary-subtle text-primary ms-2">
                          You
                        </span>
                      )}
                    </td>
                    <td className="text-end">
                      {row.total_completions ?? 0}
                    </td>
                    <td className="text-end">
                      {row.current_streak ?? 0}
                    </td>
                    <td className="text-end">
                      {row.longest_streak ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
