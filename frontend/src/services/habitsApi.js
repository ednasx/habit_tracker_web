import { apiRequest } from './apiClient'

/**
 * Fetch list of habits from backend.
 * Expected backend route: GET /api/habits
 */
export async function getHabits() {
  return apiRequest('/habits')
}

/**
 * Create a new habit.
 * Expected backend route: POST /api/habits
 *
 * @param {{ name: string, description?: string }} habit
 */
export async function createHabit(habit) {
  return apiRequest('/habits', {
    method: 'POST',
    body: JSON.stringify(habit),
  })
}

export function updateHabit(id, payload) {
  return apiRequest(`/habits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteHabit(id) {
  return apiRequest(`/habits/${id}`, {
    method: 'DELETE',
  })
}

export function logHabitCompletionToday(id) {
  return apiRequest(`/habits/${id}/logs`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}
