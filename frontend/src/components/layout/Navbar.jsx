function Navbar({ session, onSignOut, currentView, onNavigate, pendingRequestsCount = 0 }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm small-nav">
      <div className="container">
        <a 
          className="navbar-brand fw-bold text-primary" 
          href="#"
          onClick={(e) => {
            e.preventDefault()
            if (session) onNavigate('dashboard')
          }}
          style={{ cursor: session ? 'pointer' : 'default' }}
        >
          Habit Tracker
        </a>

        <div className="d-flex align-items-center gap-3 ms-auto">
          {session && (
            <>
              <button
                className={`btn btn-sm ${
                  currentView === 'dashboard' ? 'btn-primary' : 'btn-outline-primary'
                }`}
                onClick={() => onNavigate('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`btn btn-sm position-relative ${
                  currentView === 'friends' ? 'btn-primary' : 'btn-outline-primary'
                }`}
                onClick={() => onNavigate('friends')}
              >
                Friends
                {pendingRequestsCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {pendingRequestsCount}
                    <span className="visually-hidden">pending requests</span>
                  </span>
                )}
              </button>
            </>
          )}

          {session ? (
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={onSignOut}
            >
              Sign out
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
