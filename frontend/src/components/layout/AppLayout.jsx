import Navbar from './Navbar'
import Footer from './Footer'

function AppLayout({ children, session, onSignOut }) {
  return (
    <div className="app-root d-flex flex-column min-vh-100">
      <Navbar session={session} onSignOut={onSignOut} />

      <main className="app-main flex-grow-1 py-4">
        <div className="container">{children}</div>
      </main>

      <Footer />
    </div>
  )
}

export default AppLayout
