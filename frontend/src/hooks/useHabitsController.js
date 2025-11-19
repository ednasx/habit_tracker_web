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
 * - realtime updates when new habit_logs are inserted
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

  // --- Realtime subscription: refresh when a new habit_log is inserted for this user ---
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    const channel = supabase
      .channel(`habit-logs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'habit_logs',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('[Realtime] New habit log:', payload.new)
          // Simplest: reload habits so the dashboard stays in sync
          await loadHabits()
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] habit_logs channel status:', status)
      })

    // Cleanup when session changes or component unmounts
    return () => {
      supabase.removeChannel(channel)
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
    if (!window.confirm('Delete this habit?')) return

    try {
      await deleteHabit(habitId) // will NOT throw now if backend returns 204
      setHabits((prev) => prev.filter((h) => h.id !== habitId))
    } catch (err) {
      console.error('[Habits] delete error:', err.message)
      alert('Failed to delete habit.')
    }
  }

  async function handleHabitCompleted(habitId) {
    try {
      await logHabitCompletionToday(habitId)
      // Realtime subscription will re-run loadHabits when the new log is inserted.
      alert('Habit marked as completed for today.')
    } catch (err) {
      console.error('[Habits] completion error:', err.message)
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
