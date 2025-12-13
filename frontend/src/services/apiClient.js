// src/services/apiClient.js
const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

/**
 * Generic API request helper.
 *
 * @param {string} path - Path starting with "/", e.g. "/users/profile"
 * @param {RequestInit} options - fetch options
 * @param {string} baseUrl - Optional base URL override, e.g. "http://localhost:4001/api"
 */
export async function apiRequest(path, options = {}, baseUrl = DEFAULT_API_BASE_URL) {
  const url = `${baseUrl}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data = null;

  // 204 No Content → no body to parse
  if (response.status !== 204) {
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.warn('[apiClient] Failed to parse JSON response:', err.message);
      }
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}
