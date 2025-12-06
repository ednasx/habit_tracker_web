// src/services/userApi.js
import { apiRequest } from './apiClient';

// Use dedicated base in dev if provided, otherwise fall back to VITE_API_BASE_URL (prod)
const USER_API_BASE =
  import.meta.env.VITE_USER_SERVICE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4001/api'; // last-resort default for dev

/**
 * User Profile API
 */

export async function getUserProfile() {
  return apiRequest('/users/profile', {
    method: 'GET',
  }, USER_API_BASE);
}

export async function createOrUpdateProfile(username, displayName = '') {
  return apiRequest('/users/profile', {
    method: 'POST',
    body: JSON.stringify({
      username,
      display_name: displayName,
    }),
  }, USER_API_BASE);
}

export async function searchUsers(query) {
  return apiRequest(`/users/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
  }, USER_API_BASE);
}

/**
 * Friends API
 */

export async function getFriends() {
  return apiRequest('/users/friends', {
    method: 'GET',
  }, USER_API_BASE);
}

export async function getPendingRequests() {
  return apiRequest('/users/friends/pending', {
    method: 'GET',
  }, USER_API_BASE);
}

export async function getSentRequests() {
  return apiRequest('/users/friends/sent', {
    method: 'GET',
  }, USER_API_BASE);
}

export async function sendFriendRequest(username) {
  return apiRequest('/users/friends/request', {
    method: 'POST',
    body: JSON.stringify({ username }),
  }, USER_API_BASE);
}

export async function acceptFriendRequest(friendId) {
  return apiRequest(`/users/friends/${friendId}/accept`, {
    method: 'POST',
  }, USER_API_BASE);
}

export async function rejectFriendRequest(friendId) {
  return apiRequest(`/users/friends/${friendId}/reject`, {
    method: 'POST',
  }, USER_API_BASE);
}

export async function removeFriend(friendId) {
  return apiRequest(`/users/friends/${friendId}`, {
    method: 'DELETE',
  }, USER_API_BASE);
}
