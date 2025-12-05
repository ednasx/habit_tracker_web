import { useState, useEffect } from 'react'
import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '../services/userApi'

function Friends() {
  const [activeTab, setActiveTab] = useState('friends') // 'friends', 'pending', 'search'
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Load friends on mount
  useEffect(() => {
    loadFriends()
    loadPendingRequests()
    loadSentRequests()
  }, [])

  const loadFriends = async () => {
    try {
      setLoading(true)
      const data = await getFriends()
      setFriends(data || [])
    } catch (err) {
      console.error('[Friends] Error loading friends:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingRequests = async () => {
    try {
      const data = await getPendingRequests()
      setPendingRequests(data || [])
    } catch (err) {
      console.error('[Friends] Error loading pending requests:', err.message)
    }
  }

  const loadSentRequests = async () => {
    try {
      const data = await getSentRequests()
      setSentRequests(data || [])
    } catch (err) {
      console.error('[Friends] Error loading sent requests:', err.message)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setError('Please enter at least 2 characters')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await searchUsers(searchQuery.trim())
      setSearchResults(data || [])
    } catch (err) {
      console.error('[Friends] Search error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendRequest = async (username) => {
    try {
      setError(null)
      setSuccessMessage(null)
      await sendFriendRequest(username)
      setSuccessMessage(`Friend request sent to @${username}!`)
      loadSentRequests()
      // Remove from search results
      setSearchResults((prev) =>
        prev.filter((user) => user.username !== username)
      )
    } catch (err) {
      console.error('[Friends] Send request error:', err.message)
      setError(err.message)
    }
  }

  const handleAcceptRequest = async (userId) => {
    try {
      setError(null)
      setSuccessMessage(null)
      await acceptFriendRequest(userId)
      setSuccessMessage('Friend request accepted!')
      loadFriends()
      loadPendingRequests()
    } catch (err) {
      console.error('[Friends] Accept error:', err.message)
      setError(err.message)
    }
  }

  const handleRejectRequest = async (userId) => {
    try {
      setError(null)
      await rejectFriendRequest(userId)
      loadPendingRequests()
    } catch (err) {
      console.error('[Friends] Reject error:', err.message)
      setError(err.message)
    }
  }

  const handleRemoveFriend = async (userId, username) => {
    if (!confirm(`Remove @${username} from your friends?`)) {
      return
    }

    try {
      setError(null)
      await removeFriend(userId)
      loadFriends()
    } catch (err) {
      console.error('[Friends] Remove error:', err.message)
      setError(err.message)
    }
  }

  const renderFriendsList = () => {
    if (loading && friends.length === 0) {
      return (
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm mb-2" role="status" />
          <p className="text-muted mb-0">Loading friends...</p>
        </div>
      )
    }

    if (friends.length === 0) {
      return (
        <div className="text-center py-5">
          <p className="text-muted mb-3">You don't have any friends yet.</p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setActiveTab('search')}
          >
            Find Friends
          </button>
        </div>
      )
    }

    return (
      <div className="row g-3">
        {friends.map((friend) => (
          <div key={friend.user_id} className="col-12 col-md-6">
            <div className="card border h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="mb-1">
                      {friend.display_name || friend.username}
                    </h6>
                    <p className="text-muted small mb-0">@{friend.username}</p>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() =>
                      handleRemoveFriend(friend.user_id, friend.username)
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderPendingRequests = () => {
    if (pendingRequests.length === 0 && sentRequests.length === 0) {
      return (
        <div className="text-center py-5">
          <p className="text-muted mb-0">No pending requests</p>
        </div>
      )
    }

    return (
      <>
        {/* Received Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-4">
            <h6 className="mb-3">
              Requests Received ({pendingRequests.length})
            </h6>
            <div className="row g-3">
              {pendingRequests.map((request) => (
                <div key={request.user_id} className="col-12">
                  <div className="card border">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">
                            {request.display_name || request.username}
                          </h6>
                          <p className="text-muted small mb-0">
                            @{request.username}
                          </p>
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleAcceptRequest(request.user_id)}
                          >
                            Accept
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleRejectRequest(request.user_id)}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <div>
            <h6 className="mb-3">Requests Sent ({sentRequests.length})</h6>
            <div className="row g-3">
              {sentRequests.map((request) => (
                <div key={request.user_id} className="col-12 col-md-6">
                  <div className="card border">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">
                            {request.display_name || request.username}
                          </h6>
                          <p className="text-muted small mb-0">
                            @{request.username}
                          </p>
                        </div>
                        <span className="badge bg-warning text-dark">
                          Pending
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  const renderSearch = () => {
    return (
      <>
        <div className="mb-4">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <small className="text-muted">
            Enter at least 2 characters to search
          </small>
        </div>

        {searchResults.length > 0 && (
          <div className="row g-3">
            {searchResults.map((user) => (
              <div key={user.user_id} className="col-12 col-md-6">
                <div className="card border">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-1">
                          {user.display_name || user.username}
                        </h6>
                        <p className="text-muted small mb-0">
                          @{user.username}
                        </p>
                      </div>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleSendRequest(user.username)}
                      >
                        Add Friend
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery && searchResults.length === 0 && !loading && (
          <div className="text-center py-4">
            <p className="text-muted mb-0">No users found</p>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="friends-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 mb-1">Friends</h2>
          <p className="text-muted small mb-0">
            Connect with friends and track habits together
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <span className="badge bg-primary rounded-pill">
            {pendingRequests.length} new
          </span>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          />
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {successMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage(null)}
          />
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="badge bg-danger rounded-pill ms-2">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Find Friends
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      {activeTab === 'friends' && renderFriendsList()}
      {activeTab === 'pending' && renderPendingRequests()}
      {activeTab === 'search' && renderSearch()}
    </div>
  )
}

export default Friends

