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
