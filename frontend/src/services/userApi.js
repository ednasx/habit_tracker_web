import { apiRequest } from './apiClient'

/**
 * User Profile API
 */

export async function getUserProfile() {
  return apiRequest('/users/profile', {
    method: 'GET',
  })
}

export async function createOrUpdateProfile(username, displayName = '') {
  return apiRequest('/users/profile', {
    method: 'POST',
    body: JSON.stringify({
      username,
      display_name: displayName,
    }),
  })
}

export async function searchUsers(query) {
  return apiRequest(`/users/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
  })
}

/**
 * Friends API
 */

export async function getFriends() {
  return apiRequest('/users/friends', {
    method: 'GET',
  })
}

export async function getPendingRequests() {
  return apiRequest('/users/friends/pending', {
    method: 'GET',
  })
}

export async function getSentRequests() {
  return apiRequest('/users/friends/sent', {
    method: 'GET',
  })
}

export async function sendFriendRequest(username) {
  return apiRequest('/users/friends/request', {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
}

export async function acceptFriendRequest(friendId) {
  return apiRequest(`/users/friends/${friendId}/accept`, {
    method: 'POST',
  })
}

export async function rejectFriendRequest(friendId) {
  return apiRequest(`/users/friends/${friendId}/reject`, {
    method: 'POST',
  })
}

export async function removeFriend(friendId) {
  return apiRequest(`/users/friends/${friendId}`, {
    method: 'DELETE',
  })
}

