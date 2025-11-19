import { useEffect } from 'react'
import AppLayout from './components/layout/AppLayout'
import HabitForm from './components/HabitForm'
import AuthPage from './components/auth/AuthPage'
import HabitsList from './components/HabitsList'
import { useAuthSession } from './hooks/useAuthSession'
import { useHabitsController } from './hooks/useHabitsController'

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
        <button className="btn btn-outline-secondary btn-sm" onClick={signOut}>
          Sign out
        </button>
      </div>

      <HabitForm onHabitCreated={handleHabitCreated} />

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
    </AppLayout>
  )
}

export default App
