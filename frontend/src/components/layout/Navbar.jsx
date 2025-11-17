function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm">
      <div className="container">
        <a className="navbar-brand fw-bold text-primary" href="#">
          Habit Tracker
        </a>

        {/* In future you can add a collapse button and links here */}
        <div className="d-flex align-items-center gap-3">
          <span className="text-muted small d-none d-sm-inline">
            Dashboard
          </span>
          <button className="btn btn-outline-primary btn-sm" type="button">
            Login
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
