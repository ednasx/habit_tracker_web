import AppLayout from './components/layout/AppLayout'
import HabitForm from './components/HabitForm'
import AuthPage from './components/auth/AuthPage'
import HabitsList from './components/HabitsList'
import { useAuthSession } from './hooks/useAuthSession'
import { useHabitsController } from './hooks/useHabitsController'
import Leaderboard from './components/Leaderboard'

function App() {
  const { session, authLoading, signOut } = useAuthSession()
  const {
    habits,
    loadingHabits,
    error,
    editingHabitId,
    editForm,
    setEditForm,
    handleHabitCreated,
    startEdit,
    cancelEdit,
    handleHabitUpdated,
    handleHabitDeleted,
    handleHabitCompleted,
  } = useHabitsController(session)

  // Compute a simple "current streak" summary across habits (max of per-habit streaks)
  const maxCurrentStreak = habits.reduce(
    (max, h) => Math.max(max, h.current_streak || 0),
    0
  )

  // While we check auth
  if (authLoading) {
    return (
      <AppLayout session={session} onSignOut={signOut}>
        <div className="d-flex align-items-center justify-content-center min-vh-50">
          <div className="text-center">
            <div className="spinner-border mb-3" role="status" />
            <p className="text-muted mb-0">Checking your session…</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Not logged in → show auth page inside layout (navbar + footer still visible)
  if (!session) {
    return (
      <AppLayout session={null} onSignOut={signOut}>
        <AuthPage />
      </AppLayout>
    )
  }

  // Logged in → habit dashboard
  return (
    <AppLayout session={session} onSignOut={signOut}>
      <div className="dashboard-shell">
        {/* Header + stats */}
        <header className="dashboard-header mb-4">
          <div>
            <h1 className="display-6 fw-semibold mb-1">Dashboard</h1>
            <p className="text-muted mb-0">
              Track your daily habits, stay consistent, and watch your streaks grow.
            </p>
          </div>
          <div className="dashboard-stats">
            <div className="stat-pill">
              <span className="stat-label">Habits</span>
              <span className="stat-value">{habits.length}</span>
            </div>
            <div className="stat-pill stat-pill--streak">
              <span className="stat-label">Current streak</span>
              <span className="stat-value">
                {maxCurrentStreak} day{maxCurrentStreak === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </header>

        {/* Create habit */}
        <section className="mb-4">
          <HabitForm onHabitCreated={handleHabitCreated} />
        </section>

        {/* Habits list */}
        <section className="mb-4">
          <h2 className="h5 mb-3">Your habits</h2>
          <HabitsList
            habits={habits}
            loading={loadingHabits}
            error={error}
            editingHabitId={editingHabitId}
            editForm={editForm}
            setEditForm={setEditForm}
            onStartEdit={startEdit}
            onCancelEdit={cancelEdit}
            onUpdateHabit={handleHabitUpdated}
            onDeleteHabit={handleHabitDeleted}
            onCompleteHabit={handleHabitCompleted}
          />
        </section>

        {/* Leaderboard */}
        <section className="mb-4">
          <Leaderboard />
        </section>
      </div>
    </AppLayout>
  )
}

export default App
