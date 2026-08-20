import { useEffect, useState } from 'react'
import RoundForm from './RoundForm'
import { ROUNDS } from '../config/rounds'
import { statusLabel } from '../lib/exportRepo'
import type { BankQuestion, Candidate, Evaluation } from '../lib/types'
import type { EvaluationDraft } from '../lib/api'
import { RECORDED_BY } from '../config/app'

type Props = {
  candidate: Candidate
  evaluations: Evaluation[]
  questionBank: BankQuestion[]
  onClose: () => void
  onSubmit: (draft: EvaluationDraft) => Promise<void>
  onExportRound: (roundKey: string) => void
  onEdit: () => void
}

export default function CandidateDrawer({
  candidate,
  evaluations,
  questionBank,
  onClose,
  onSubmit,
  onExportRound,
  onEdit,
}: Props) {
  // Open on the round the candidate is actually on — that is what you are here to do.
  const [activeKey, setActiveKey] = useState(
    () => ROUNDS.find((r) => r.number === candidate.current_round)?.key ?? ROUNDS[0].key,
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const active = ROUNDS.find((r) => r.key === activeKey) ?? ROUNDS[0]
  // One scorecard per candidate per round now that everything is recorded under
  // a single name. Matched case-insensitively, as the unique index does.
  const existing =
    evaluations.find(
      (e) =>
        e.round_key === active.key &&
        e.interviewer_name.trim().toLowerCase() === RECORDED_BY.toLowerCase(),
    ) ?? null

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Candidate">
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer__head">
          <div className="flex-1">
            <h2 className="heading-section">{candidate.full_name || candidate.email}</h2>
            <p className="caption mt-8">
              {candidate.email}
              {candidate.portfolio_url && (
                <>
                  {' · '}
                  <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer">
                    Portfolio ↗
                  </a>
                </>
              )}
            </p>
            <div className="row gap-8 wrap mt-16">
              <span className="chip chip--mono chip--active">
                Round {candidate.current_round} of {ROUNDS.length}
              </span>
              <span className="chip chip--quiet">{statusLabel(candidate.status)}</span>
            </div>
          </div>
          <div className="row gap-8">
            <button type="button" className="btn-pill" onClick={onEdit}>
              Edit details
            </button>
            <button className="btn-icon" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </header>

        <div className="drawer__body">
          <div className="tabs" role="tablist">
            {ROUNDS.map((r) => {
              const done = evaluations.some((e) => e.round_key === r.key)
              return (
                <button
                  key={r.key}
                  role="tab"
                  className="tab"
                  aria-selected={r.key === activeKey}
                  onClick={() => setActiveKey(r.key)}
                >
                  <span className="mono-label">
                    Round {r.number}
                    {done ? ' · scored' : r.number === candidate.current_round ? ' · current' : ''}
                  </span>
                  <span className="tab__title">{r.title}</span>
                </button>
              )
            })}
          </div>

          <RoundForm
            // Remount when the round or this interviewer's saved scorecard changes,
            // so the form fields reset from the right source of truth.
            key={`${active.key}:${existing?.id ?? 'new'}:${existing?.submitted_at ?? ''}`}
            round={active}
            candidateId={candidate.id}
            questionBank={questionBank}
            existing={existing}
            notYetReached={active.number > candidate.current_round}
            onSubmit={onSubmit}
            onExportReport={() => onExportRound(active.key)}
          />
        </div>
      </div>
    </div>
  )
}
