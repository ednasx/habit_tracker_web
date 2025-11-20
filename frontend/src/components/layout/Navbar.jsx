function Navbar({ session, onSignOut }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm small-nav">
      <div className="container">
        <a className="navbar-brand fw-bold text-primary" href="#">
          Habit Tracker
        </a>

        <div className="d-flex align-items-center gap-3 ms-auto">
          {session && (
            <span className="text-muted small d-none d-sm-inline">
              Dashboard
            </span>
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
