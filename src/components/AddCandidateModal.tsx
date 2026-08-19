import { useEffect, useState } from 'react'
import type { NewCandidate } from '../lib/types'
import { errorMessage } from '../lib/errors'

type Props = {
  onClose: () => void
  onAdd: (candidate: NewCandidate) => Promise<void>
}

export default function AddCandidateModal({ onClose, onAdd }: Props) {
  const [form, setForm] = useState<NewCandidate>({ username: '', email: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function set<K extends keyof NewCandidate>(key: K, value: NewCandidate[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onAdd(form)
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'Could not add candidate.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="overlay overlay--center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add candidate"
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row gap-16">
          <h2 className="heading-section flex-1">Add candidate</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="stack gap-24 mt-32">
          {error && <div className="notice notice--error">{error}</div>}

          <div className="grid-2">
            <div className="field">
              <label className="field__label" htmlFor="c-username">
                Username <span className="req">*</span>
              </label>
              <input
                id="c-username"
                className="input"
                required
                autoFocus
                placeholder="anita.r"
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="c-email">
                Email <span className="req">*</span>
              </label>
              <input
                id="c-email"
                className="input"
                type="email"
                required
                placeholder="anita@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="c-name">
              Full name
            </label>
            <input
              id="c-name"
              className="input"
              placeholder="Anita Rao"
              value={form.full_name ?? ''}
              onChange={(e) => set('full_name', e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label className="field__label" htmlFor="c-portfolio">
                Portfolio URL
              </label>
              <input
                id="c-portfolio"
                className="input"
                type="url"
                placeholder="https://…"
                value={form.portfolio_url ?? ''}
                onChange={(e) => set('portfolio_url', e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="c-source">
                Source
              </label>
              <input
                id="c-source"
                className="input"
                placeholder="Referral, LinkedIn…"
                value={form.source ?? ''}
                onChange={(e) => set('source', e.target.value)}
              />
            </div>
          </div>

          <p className="caption">
            Candidate details are personal data. Add only what the panel needs to run the
            interview.
          </p>

          <div className="row gap-24 end">
            <button type="button" className="btn-text" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Adding…' : 'Add candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
