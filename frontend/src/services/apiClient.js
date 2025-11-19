const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

let authToken = null

export function setAuthToken(token) {
  authToken = token || null
}

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Try to parse JSON **only if** there is a body
  let data = null

  // 204 No Content → no body to parse
  if (response.status !== 204) {
    const text = await response.text()
    if (text) {
      try {
        data = JSON.parse(text)
      } catch (err) {
        console.warn('[apiClient] Failed to parse JSON response:', err.message)
      }
    }
  }

  // Handle non-2xx errors
  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Request failed with status ${response.status}`

    throw new Error(message)
  }

  return data
}
