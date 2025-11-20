import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import AuthIntro from './AuthIntro'

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
      // Supabase will update session; App picks it up
    } catch (err) {
      console.error('[AuthPage] Auth error:', err.message)
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page py-5">
      <div className="container">
        <div className="row g-4 align-items-center">
          {/* Left side: intro text (hidden on small screens) */}
          <div className="col-lg-6 d-none d-lg-block">
            <AuthIntro />
          </div>

          {/* Right side: auth card */}
          <div className="col-12 col-lg-5 ms-lg-auto">
            <div className="card shadow-sm border-0 auth-card">
              <div className="card-body p-4 p-md-4">
                <h2 className="h4 text-center mb-1">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="text-muted small text-center mb-3">
                  {mode === 'login'
                    ? 'Sign in to continue tracking your habits.'
                    : 'Join Habit Tracker Web and start building better routines.'}
                </p>

                <ul className="nav nav-tabs mb-3 justify-content-center">
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

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading
                      ? 'Please wait...'
                      : mode === 'login'
                      ? 'Login'
                      : 'Register'}
                  </button>
                </form>

                <p className="text-muted small mb-0 text-center">
                  This app uses Supabase for authentication.
                </p>
              </div>
            </div>

            {/* On mobile, show intro below the card */}
            <div className="d-lg-none mt-4">
              <AuthIntro />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
