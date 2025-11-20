// frontend/src/components/auth/AuthIntro.jsx

function AuthIntro() {
  return (
    <div className="auth-intro">
      <div className="auth-intro-pill mb-3">
        <span className="auth-dot" />
        <span className="auth-pill-text">Stay consistent, one habit at a time</span>
      </div>

      <h1 className="display-5 fw-semibold mb-2 text-primary">
        Habit Tracker Web
      </h1>

      <p className="lead text-muted mb-4">
        A simple, focused dashboard to help you build routines, hit streaks,
        and keep yourself accountable.
      </p>

      <div className="auth-intro-grid mb-4">
        <div className="auth-intro-card">
          <div className="auth-intro-emoji">📆</div>
          <h2 className="h6 mb-1">Daily check-ins</h2>
          <p className="small text-muted mb-0">
            Mark your habits as done and watch your streaks grow day by day.
          </p>
        </div>

        <div className="auth-intro-card">
          <div className="auth-intro-emoji">📊</div>
          <h2 className="h6 mb-1">See your progress</h2>
          <p className="small text-muted mb-0">
            Get a quick overview of how many habits you’re maintaining.
          </p>
        </div>

        <div className="auth-intro-card">
          <div className="auth-intro-emoji">🤝</div>
          <h2 className="h6 mb-1">Friends leaderboard</h2>
          <p className="small text-muted mb-0">
            Compare completion stats with friends and keep each other motivated.
          </p>
        </div>
      </div>

      <p className="small text-muted mb-0">
        Create an account in seconds. No extra setup — just log in and start
        tracking your habits.
      </p>
    </div>
  )
}

export default AuthIntro
