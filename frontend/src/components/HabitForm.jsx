import { useState } from 'react'
import { createHabit } from '../services/habitsApi'

function HabitForm({ onHabitCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter a habit name.')
      return
    }

    try {
      setSubmitting(true)

      const newHabit = await createHabit({
        name: name.trim(),
        description: description.trim() || undefined,
      })

      if (onHabitCreated) {
        onHabitCreated(newHabit)
      }

      setName('')
      setDescription('')
    } catch (err) {
      console.error(err)
      setError('Could not create habit. Please check that the backend is running.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card border-0 shadow-sm dashboard-card">
      <div className="card-body">
        <h2 className="h5 mb-3">Create a new habit</h2>
        <form onSubmit={handleSubmit} className="row g-3">
          <div className="col-12 col-md-6">
            <label htmlFor="habitName" className="form-label">
              Habit name <span className="text-danger">*</span>
            </label>
            <input
              id="habitName"
              type="text"
              className="form-control"
              placeholder="e.g. Drink 2L of water"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="col-12 col-md-6">
            <label htmlFor="habitDescription" className="form-label">
              Description <span className="text-muted small">(optional)</span>
            </label>
            <input
              id="habitDescription"
              type="text"
              className="form-control"
              placeholder="Short description to remind you why it matters"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="col-12">
              <div className="alert alert-danger py-2 mb-0" role="alert">
                {error}
              </div>
            </div>
          )}

          <div className="col-12 d-flex justify-content-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default HabitForm
