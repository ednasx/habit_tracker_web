import React, { useEffect, useRef, useState } from 'react'

function HabitsList({
  habits,
  loading,
  error,
  editingHabitId,
  editForm,
  setEditForm,
  onStartEdit,
  onCancelEdit,
  onUpdateHabit,
  onDeleteHabit,
  onCompleteHabit,
}) {
  const [deletingId, setDeletingId] = useState(null)
  const [addedIds, setAddedIds] = useState([])
  const prevIdsRef = useRef([])

  // Detect newly added habits → animate them
  useEffect(() => {
    const currentIds = habits.map((h) => h.id)
    const prevIds = prevIdsRef.current

    const newIds = currentIds.filter((id) => !prevIds.includes(id))

    if (newIds.length > 0) {
      setAddedIds(newIds)

      // Clear the "added" class after the animation completes
      const timeout = setTimeout(() => {
        setAddedIds([])
      }, 300)

      prevIdsRef.current = currentIds
      return () => clearTimeout(timeout)
    }

    prevIdsRef.current = currentIds
  }, [habits])

  // Local click handler for delete → animate, then call parent delete
  function handleDeleteClick(habitId) {
    setDeletingId(habitId)

    // Wait for CSS animation, then trigger actual delete
    setTimeout(() => {
      onDeleteHabit(habitId)
      setDeletingId(null)
    }, 250)
  }

  if (loading) {
    return (
      <div className="alert alert-info" role="alert">
        Loading habits...
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )
  }

  if (!habits || habits.length === 0) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5">
          <h2 className="h5 mb-2">No habits yet</h2>
          <p className="text-muted mb-3">
            Use the form above to create your first habit.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="row g-3">
      {habits.map((habit) => {
        const isEditing = editingHabitId === habit.id
        const isDeleting = deletingId === habit.id
        const isAdded = addedIds.includes(habit.id)

        const cardClasses = [
          'card',
          'h-100',
          'border-0',
          'shadow-sm',
          'habit-card',
          isDeleting ? 'habit-card--deleting' : '',
          isAdded ? 'habit-card--added' : '',
        ]
          .filter(Boolean)
          .join(' ')

        const streak = habit.current_streak ?? 0

        return (
          <div className="col-12 col-md-6 col-lg-4" key={habit.id}>
            <div className={cardClasses}>
              <div className="card-body">
                {isEditing ? (
                  <form onSubmit={(e) => onUpdateHabit(e, habit.id)}>
                    <div className="mb-2">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="Habit name"
                        required
                      />
                    </div>
                    <div className="mb-2">
                      <textarea
                        className="form-control form-control-sm"
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Description (optional)"
                        rows={2}
                      />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-light btn-sm"
                        onClick={onCancelEdit}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm">
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h2 className="h5 mb-1">{habit.name}</h2>
                    {habit.description && (
                      <p className="text-muted small mb-2">
                        {habit.description}
                      </p>
                    )}

                    {/* streak badge */}
                    <div className="mb-3">
                      <span className="streak-badge">
                        🔥 {streak} day{streak === 1 ? '' : 's'} streak
                      </span>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        onClick={() => onCompleteHabit(habit.id)}
                      >
                        Mark done today
                      </button>

                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => onStartEdit(habit)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDeleteClick(habit.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default HabitsList
