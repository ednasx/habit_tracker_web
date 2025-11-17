import Navbar from './Navbar'
import Footer from './Footer'

function AppLayout({ children }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />

      <main className="flex-grow-1 py-4">
        <div className="container">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default AppLayout
