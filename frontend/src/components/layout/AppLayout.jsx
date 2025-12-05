import Navbar from './Navbar'
import Footer from './Footer'

function AppLayout({ children, session, onSignOut, currentView, onNavigate, pendingRequestsCount }) {
  return (
    <div className="app-root d-flex flex-column min-vh-100">
      <Navbar 
        session={session} 
        onSignOut={onSignOut}
        currentView={currentView}
        onNavigate={onNavigate}
        pendingRequestsCount={pendingRequestsCount}
      />

      <main className="app-main flex-grow-1 py-4">
        <div className="container">{children}</div>
      </main>

      <Footer />
    </div>
  )
}

export default AppLayout
