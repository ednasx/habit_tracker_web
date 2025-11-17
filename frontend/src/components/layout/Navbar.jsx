function Navbar() {
  return (
    <header
      style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #ddd',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ fontWeight: 'bold' }}>Habit Tracker</div>
      <nav>
        {/* Later you can replace this with real navigation / links */}
        <span style={{ fontSize: '0.9rem', color: '#555' }}>Dashboard</span>
      </nav>
    </header>
  )
}

export default Navbar
