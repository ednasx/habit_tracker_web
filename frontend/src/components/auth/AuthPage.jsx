import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' or 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!email.trim() || !password) {
      setError('Please enter an email and password.')
      return
    }

    try {
      setLoading(true)

      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (signInError) throw signInError

        setMessage('Logged in successfully.')
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })

        if (signUpError) throw signUpError

        setMessage('Registration successful. You may need to confirm your email.')
      }

      // On success, Supabase will update the session; App will pick it up
    } catch (err) {
      console.error('[AuthPage] Auth error:', err.message)
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-sm" style={{ maxWidth: '420px', width: '100%' }}>
        <div className="card-body p-4">
          <h1 className="h4 text-center mb-3">Habit Tracker</h1>

          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setMode('login')
                  setError(null)
                  setMessage(null)
                }}
              >
                Login
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${mode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setMode('register')
                  setError(null)
                  setMessage(null)
                }}
              >
                Register
              </button>
            </li>
          </ul>

          <form onSubmit={handleSubmit} className="mb-3">
            <div className="mb-3">
              <label htmlFor="authEmail" className="form-label">
                Email
              </label>
              <input
                id="authEmail"
                type="email"
                className="form-control"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="authPassword" className="form-label">
                Password
              </label>
              <input
                id="authPassword"
                type="password"
                className="form-control"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="alert alert-success py-2" role="alert">
                {message}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>

          <p className="text-muted small mb-0 text-center">
            This app uses Supabase for authentication.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
