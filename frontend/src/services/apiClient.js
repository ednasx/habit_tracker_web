const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

/**
 * Generic helper to call the backend API.
 *
 * @param {string} path - The API path, e.g. "/habits"
 * @param {RequestInit} options - fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`

  const defaultHeaders = {
    'Content-Type': 'application/json',
    // Later you can add Authorization: `Bearer ${token}` here
  }

  const response = await fetch(url, {
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    // Try to get error message from backend if it sends JSON
    let detail = ''
    try {
      const data = await response.json()
      if (data && data.message) {
        detail = ` (${data.message})`
      }
    } catch {
      // ignore JSON parse errors
    }

    throw new Error(`API error: ${response.status} ${response.statusText}${detail}`)
  }

  // Assuming JSON response for all endpoints
  return response.json()
}
