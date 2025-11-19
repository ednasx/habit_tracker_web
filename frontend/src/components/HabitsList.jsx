import React from 'react'

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
  return (
    <>
      {loading && (
        <div className="alert alert-info" role="alert">
          Loading habits...
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {habits.length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <h2 className="h5 mb-2">No habits yet</h2>
                <p className="text-muted mb-3">
                  Use the form above to create your first habit.
                </p>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              {habits.map((habit) => {
                const isEditing = editingHabitId === habit.id

                return (
                  <div className="col-12 col-md-6 col-lg-4" key={habit.id}>
                    <div className="card h-100 border-0 shadow-sm habit-card">
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
                              <p className="text-muted small mb-3">
                                {habit.description}
                              </p>
                            )}

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
                                  onClick={() => onDeleteHabit(habit.id)}
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
          )}
        </>
      )}
    </>
  )
}

export default HabitsList
