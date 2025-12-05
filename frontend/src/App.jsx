import { useState, useEffect } from 'react'
import AppLayout from './components/layout/AppLayout'
import HabitForm from './components/HabitForm'
import AuthPage from './components/auth/AuthPage'
import HabitsList from './components/HabitsList'
import UsernameSetup from './components/UsernameSetup'
import Friends from './components/Friends'
import { useAuthSession } from './hooks/useAuthSession'
import { useHabitsController } from './hooks/useHabitsController'
import Leaderboard from './components/Leaderboard'
import { getUserProfile, getPendingRequests } from './services/userApi'

function App() {
  const { session, authLoading, signOut } = useAuthSession()
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' or 'friends'
  const [hasProfile, setHasProfile] = useState(null) // null = checking, true/false = result
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  
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

  // Check if user has a profile (username set)
  useEffect(() => {
    async function checkProfile() {
      if (!session) {
        setHasProfile(null)
        return
      }

      try {
        const profile = await getUserProfile()
        setHasProfile(!!profile?.username)
      } catch (err) {
        // 404 means no profile yet
        if (err.message.includes('not found') || err.message.includes('404')) {
          setHasProfile(false)
        } else {
          console.error('[App] Error checking profile:', err.message)
          setHasProfile(false)
        }
      }
    }

    checkProfile()
  }, [session])

  // Poll for pending friend requests count
  useEffect(() => {
    if (!session || !hasProfile) return

    async function loadPendingCount() {
      try {
        const requests = await getPendingRequests()
        setPendingRequestsCount(requests?.length || 0)
      } catch (err) {
        console.error('[App] Error loading pending requests:', err.message)
      }
    }

    loadPendingCount()
    
    // Poll every 30 seconds
    const interval = setInterval(loadPendingCount, 30000)
    return () => clearInterval(interval)
  }, [session, hasProfile])

  const handleUsernameSet = async () => {
    setHasProfile(true)
  }

  const handleNavigate = (view) => {
    setCurrentView(view)
  }

  // Compute a simple "current streak" summary across habits (max of per-habit streaks)
  const maxCurrentStreak = habits.reduce(
    (max, h) => Math.max(max, h.current_streak || 0),
    0
  )

  // While we check auth
  if (authLoading || (session && hasProfile === null)) {
    return (
      <AppLayout 
        session={session} 
        onSignOut={signOut}
        currentView={currentView}
        onNavigate={handleNavigate}
        pendingRequestsCount={pendingRequestsCount}
      >
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
      <AppLayout 
        session={null} 
        onSignOut={signOut}
        currentView={currentView}
        onNavigate={handleNavigate}
        pendingRequestsCount={0}
      >
        <AuthPage />
      </AppLayout>
    )
  }

  // Logged in but no username set → show username setup
  if (session && hasProfile === false) {
    return (
      <AppLayout 
        session={session} 
        onSignOut={signOut}
        currentView={currentView}
        onNavigate={handleNavigate}
        pendingRequestsCount={0}
      >
        <UsernameSetup onUsernameSet={handleUsernameSet} />
      </AppLayout>
    )
  }

  // Logged in with profile → show friends view
  if (currentView === 'friends') {
    return (
      <AppLayout 
        session={session} 
        onSignOut={signOut}
        currentView={currentView}
        onNavigate={handleNavigate}
        pendingRequestsCount={pendingRequestsCount}
      >
        <Friends />
      </AppLayout>
    )
  }

  // Logged in with profile → habit dashboard
  return (
    <AppLayout 
      session={session} 
      onSignOut={signOut}
      currentView={currentView}
      onNavigate={handleNavigate}
      pendingRequestsCount={pendingRequestsCount}
    >
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
