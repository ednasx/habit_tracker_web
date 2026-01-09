import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  getHabits,
  updateHabit,
  deleteHabit,
  logHabitCompletionToday,
} from '../services/habitsApi'

/**
 * Encapsulates all habit-related state & actions:
 * - loading / error
 * - list of habits
 * - editing form state
 * - CRUD operations
 * - realtime updates when habit_stats are updated by analytics-service
 */
export function useHabitsController(session) {
  const [habits, setHabits] = useState([])
  const [loadingHabits, setLoadingHabits] = useState(true)
  const [error, setError] = useState(null)

  // Editing state
  const [editingHabitId, setEditingHabitId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '' })

  // Reusable loader so we can call it from both:
  // - initial load
  // - realtime event handler
  const loadHabits = useCallback(async () => {
    if (!session) {
      setHabits([])
      setLoadingHabits(false)
      setError(null)
      return
    }

    try {
      setLoadingHabits(true)
      setError(null)

      const data = await getHabits()
      setHabits(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[Habits] fetch error:', err.message)
      setError('Failed to load habits. Please try again.')
    } finally {
      setLoadingHabits(false)
    }
  }, [session])

  // Initial + on-session-change load
  useEffect(() => {
    loadHabits()
  }, [loadHabits])

  // --- Realtime subscription: refresh when habit_stats are updated by analytics-service ---
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    const statsChannel = supabase
      .channel(`habit-stats-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT (first completion) and UPDATE (subsequent completions)
          schema: 'public',
          table: 'habit_stats',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('[Realtime] Stats changed by analytics-service:', payload.eventType, payload.new)
          // Refresh habits to get updated streaks and totals
          await loadHabits()
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] habit_stats channel status:', status)
      })

    // Cleanup when session changes or component unmounts
    return () => {
      supabase.removeChannel(statsChannel)
    }
  }, [session, loadHabits])

  // --- Handlers exposed to the UI ---

  function handleHabitCreated(newHabit) {
    setHabits((prev) => [newHabit, ...prev])
  }

  function startEdit(habit) {
    setEditingHabitId(habit.id)
    setEditForm({
      name: habit.name,
      description: habit.description || '',
    })
  }

  function cancelEdit() {
    setEditingHabitId(null)
    setEditForm({ name: '', description: '' })
  }

  async function handleHabitUpdated(e, habitId) {
    if (e?.preventDefault) {
      e.preventDefault()
    }

    if (!editForm.name.trim()) {
      return
    }

    try {
      const updated = await updateHabit(habitId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
      })

      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, ...updated } : h))
      )

      cancelEdit()
    } catch (err) {
      console.error('[Habits] update error:', err.message)
      alert('Failed to update habit.')
    }
  }

  async function handleHabitDeleted(habitId) {
    try {
      await deleteHabit(habitId) // will NOT throw now if backend returns 204
      setHabits((prev) => prev.filter((h) => h.id !== habitId))
    } catch (err) {
      console.error('[Habits] delete error:', err.message)
      alert('Failed to delete habit.')
    }
  }

  async function handleHabitCompleted(habitId) {
    // 1. Optimistic update: immediately update UI with estimated stats
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h

        const currentStreak = h.current_streak ?? 0
        const totalCompletions = h.total_completions ?? 0
        const lastCompletedDate = h.last_completed_date

        // Simple optimistic logic: if last completed was yesterday or earlier, increment streak
        // Otherwise, keep current streak (same day completion)
        const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        let newStreak = currentStreak

        if (!lastCompletedDate || lastCompletedDate < today) {
          // If never completed or last completion was before today, increment streak
          // (This is a simple estimate; analytics-service will compute the real streak)
          newStreak = currentStreak + 1
        }

        return {
          ...h,
          total_completions: totalCompletions + 1,
          current_streak: newStreak,
          longest_streak: Math.max(h.longest_streak ?? 0, newStreak),
          last_completed_date: today,
        }
      })
    )

    try {
      // 2. Send API request
      await logHabitCompletionToday(habitId)

      // 3. No setTimeout needed! The habit_stats realtime subscription will automatically
      // refresh when analytics-service updates the stats after processing the RabbitMQ event.
    } catch (err) {
      console.error('[Habits] completion error:', err.message)
      // Revert optimistic update on error
      await loadHabits()
      alert('Failed to log completion.')
    }
  }

  return {
    habits,
    loadingHabits,
    error,
    editingHabitId,
    editForm,
    setEditForm,
    handleHabitCreated,
    startEdit,
    cancelEdit,
    handleHabitUpdated,
    handleHabitDeleted,
    handleHabitCompleted,
  }
}
