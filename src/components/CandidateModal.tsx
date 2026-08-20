import { useEffect, useState } from 'react'
import type { Candidate, NewCandidate } from '../lib/types'
import { errorMessage } from '../lib/errors'

type Props = {
  /** Pass a candidate to edit their details; omit to add a new one. */
  candidate?: Candidate | null
  onClose: () => void
  onSave: (candidate: NewCandidate) => Promise<void>
}

/**
 * One modal for both adding and editing. The fields are identical, so the only
 * differences are the prefill, the title and the submit label — splitting this
 * into two components would duplicate the validation for no benefit.
 */
export default function CandidateModal({ candidate, onClose, onSave }: Props) {
  const isEdit = !!candidate
  const [form, setForm] = useState<NewCandidate>({
    full_name: candidate?.full_name ?? '',
    email: candidate?.email ?? '',
    portfolio_url: candidate?.portfolio_url ?? '',
    source: candidate?.source ?? '',
  })
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
    if (!form.full_name.trim()) {
      setError('Full name is required.')
      return
    }
    setBusy(true)
    try {
      await onSave({ ...form, full_name: form.full_name.trim() })
      onClose()
    } catch (err) {
      setError(errorMessage(err, isEdit ? 'Could not save changes.' : 'Could not add candidate.'))
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
      aria-label={isEdit ? 'Edit candidate' : 'Add candidate'}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row gap-16">
          <h2 className="heading-section flex-1">{isEdit ? 'Edit candidate' : 'Add candidate'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="stack gap-24 mt-32">
          {error && <div className="notice notice--error">{error}</div>}

          <div className="grid-2">
            <div className="field">
              <label className="field__label" htmlFor="c-name">
                Full name <span className="req">*</span>
              </label>
              <input
                id="c-name"
                className="input"
                required
                autoFocus
                placeholder="Anita Rao"
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
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
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
