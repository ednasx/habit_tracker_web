// src/services/habitsApi.js
import { apiRequest } from './apiClient';

// Build base URL for habit-service, e.g. "http://localhost:4000/api"
const HABIT_API_BASE =
  import.meta.env.VITE_HABIT_SERVICE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4000/api'; // last-resort default for dev

/**
 * Fetch list of habits from backend.
 * Expected backend route: GET /api/habits
 */
export async function getHabits() {
  return apiRequest('/habits', {
    method: 'GET',
  }, HABIT_API_BASE);
}

/**
 * Create a new habit.
 *
 * @param {{ name: string, description?: string }} habit
 */
export function createHabit(habit) {
  return apiRequest('/habits', {
    method: 'POST',
    body: JSON.stringify(habit),
  }, HABIT_API_BASE);
}

export function updateHabit(id, payload) {
  return apiRequest(`/habits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, HABIT_API_BASE);
}

export function deleteHabit(id) {
  return apiRequest(`/habits/${id}`, {
    method: 'DELETE',
  }, HABIT_API_BASE);
}

export function logHabitCompletionToday(id) {
  return apiRequest(`/habits/${id}/logs`, {
    method: 'POST',
    body: JSON.stringify({}),
  }, HABIT_API_BASE);
}
