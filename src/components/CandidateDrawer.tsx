import { useEffect, useState } from 'react'
import RoundForm from './RoundForm'
import { ROUNDS } from '../config/rounds'
import { statusLabel } from '../lib/exportRepo'
import type { BankQuestion, Candidate, Evaluation } from '../lib/types'
import type { EvaluationDraft } from '../lib/api'

type Props = {
  candidate: Candidate
  evaluations: Evaluation[]
  questionBank: BankQuestion[]
  /** Self-declared name from the top bar; identifies which scorecard is yours. */
  interviewerName: string
  onClose: () => void
  onSubmit: (draft: EvaluationDraft) => Promise<void>
  onExportRound: (roundKey: string) => void
}

export default function CandidateDrawer({
  candidate,
  evaluations,
  questionBank,
  interviewerName,
  onClose,
  onSubmit,
  onExportRound,
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
  const roundEvals = evaluations.filter((e) => e.round_key === active.key)
  // Matched case-insensitively, the same way the unique index does.
  const me = interviewerName.trim().toLowerCase()
  const isMine = (e: (typeof roundEvals)[number]) =>
    me.length > 0 && e.interviewer_name.trim().toLowerCase() === me
  const mine = roundEvals.find(isMine) ?? null
  const others = roundEvals.filter((e) => !isMine(e))

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Candidate">
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer__head">
          <div className="flex-1">
            <h2 className="heading-section">{candidate.full_name || candidate.username}</h2>
            <p className="caption mt-8">
              {candidate.username} · {candidate.email}
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
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            ×
          </button>
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
            key={`${active.key}:${mine?.id ?? 'new'}:${mine?.submitted_at ?? ''}`}
            round={active}
            candidateId={candidate.id}
            questionBank={questionBank}
            existing={mine}
            others={others}
            interviewerName={interviewerName}
            locked={active.number > candidate.current_round}
            onSubmit={onSubmit}
            onExportReport={() => onExportRound(active.key)}
          />
        </div>
      </div>
    </div>
  )
}
