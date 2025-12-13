import { useState } from 'react'
import { createOrUpdateProfile } from '../services/userApi'

function UsernameSetup({ onUsernameSet }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError('Username is required')
      return
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_-]{3,20}$/
    if (!usernameRegex.test(username.trim().toLowerCase())) {
      setError(
        'Username must be 3-20 characters (lowercase letters, numbers, underscores, or hyphens only)'
      )
      return
    }

    try {
      setLoading(true)
      await createOrUpdateProfile(username.trim().toLowerCase(), displayName.trim())
      onUsernameSet()
    } catch (err) {
      console.error('[UsernameSetup] Error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="username-setup py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <h2 className="h3 mb-2">👋 Welcome!</h2>
                  <p className="text-muted mb-0">
                    Let's set up your profile. Choose a unique username to connect with friends.
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label fw-semibold">
                      Username <span className="text-danger">*</span>
                    </label>
                    <input
                      id="username"
                      type="text"
                      className="form-control"
                      placeholder="john_doe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      disabled={loading}
                      required
                    />
                    <small className="text-muted">
                      3-20 characters: lowercase letters, numbers, underscores, or hyphens
                    </small>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="displayName" className="form-label fw-semibold">
                      Display Name <span className="text-muted">(optional)</span>
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      className="form-control"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={loading}
                    />
                    <small className="text-muted">
                      This is how your name will appear to others
                    </small>
                  </div>

                  {error && (
                    <div className="alert alert-danger py-2 mb-3" role="alert">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? 'Setting up...' : 'Continue'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UsernameSetup

