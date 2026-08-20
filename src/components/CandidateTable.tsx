import RowMenu from './RowMenu'
import { ROUNDS } from '../config/rounds'
import { statusLabel } from '../lib/exportRepo'
import { evaluationScore } from '../lib/score'
import type { Candidate, Evaluation } from '../lib/types'

type Props = {
  candidates: Candidate[]
  evaluations: Evaluation[]
  selectedId: string | null
  onSelect: (candidate: Candidate) => void
  onDelete: (candidate: Candidate) => void
  onExportRound: (candidate: Candidate, roundKey: string) => void
}

/**
 * Rule-separated rows rather than a boxed table — the design system's
 * publication-list pattern, which stays scannable as the pipeline grows.
 */
export default function CandidateTable({
  candidates,
  evaluations,
  selectedId,
  onSelect,
  onDelete,
  onExportRound,
}: Props) {
  if (candidates.length === 0) {
    return (
      <div className="rows">
        <div className="empty">
          <h3 className="empty__title">No candidates yet</h3>
          <p className="empty__body">Add one by name and email to start the pipeline.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rows">
      <div className="rows__head rows__cols" aria-hidden="true">
        <span className="mono-label">Candidate</span>
        <span className="mono-label">Current round</span>
        <span className="mono-label">Status</span>
        <span className="mono-label">Scores</span>
        <span />
      </div>

      {candidates.map((c) => {
        const own = evaluations.filter((e) => e.candidate_id === c.id)
        return (
          <div
            key={c.id}
            className="row-item rows__cols"
            role="button"
            tabIndex={0}
            aria-current={c.id === selectedId}
            onClick={() => onSelect(c)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(c)
              }
            }}
          >
            <span>
              {/* Rows created before full_name became required can still be null. */}
              <span className="row-item__name">{c.full_name || c.email}</span>
              {c.full_name && <span className="row-item__meta">{c.email}</span>}
            </span>

            <span className="row-item__round">
              <CurrentRound candidate={c} />
              <Progress candidate={c} evaluations={own} />
            </span>

            <span>
              <Status status={c.status} />
            </span>

            <span className="row-item__scores">
              <Scores evaluations={own} />
            </span>

            <RowMenu
              label={`Actions for ${c.full_name || c.email}`}
              items={[
                ...ROUNDS.map((r) => {
                  const scored = own.some((e) => e.round_key === r.key)
                  return {
                    label: `Download round ${r.number} report`,
                    disabled: !scored,
                    disabledReason: `No scorecard submitted for round ${r.number} yet.`,
                    onSelect: () => onExportRound(c, r.key),
                  }
                }),
                {
                  label: 'Delete candidate',
                  danger: true,
                  onSelect: () => onDelete(c),
                },
              ]}
            />
          </div>
        )
      })}
    </div>
  )
}

function CurrentRound({ candidate }: { candidate: Candidate }) {
  if (candidate.status === 'rejected') return <span className="mono-label">Not proceeding</span>
  if (candidate.status === 'passed') return <span className="mono-label">All rounds done</span>

  const round = ROUNDS.find((r) => r.number === candidate.current_round)
  return (
    <span className="mono-label" style={{ color: 'var(--ink)' }}>
      {round ? `R${round.number} · ${round.shortTitle}` : `Round ${candidate.current_round}`}
    </span>
  )
}

function Progress({ candidate, evaluations }: { candidate: Candidate; evaluations: Evaluation[] }) {
  return (
    <span className="pips" title={`${evaluations.length} scorecard(s) submitted`}>
      {ROUNDS.map((r) => {
        const scored = evaluations.some((e) => e.round_key === r.key)
        const rejectedHere = evaluations.some(
          (e) => e.round_key === r.key && e.recommendation === 'reject',
        )
        let cls = 'pip'
        if (rejectedHere) cls += ' pip--blocked'
        else if (scored) cls += ' pip--done'
        else if (r.number === candidate.current_round && candidate.status !== 'rejected')
          cls += ' pip--current'
        return <span key={r.key} className={cls} />
      })}
    </span>
  )
}

function Scores({ evaluations }: { evaluations: Evaluation[] }) {
  if (evaluations.length === 0) return <span className="tertiary caption">—</span>
  return (
    <>
      {ROUNDS.map((r) => {
        const roundEvals = evaluations.filter((e) => e.round_key === r.key)
        if (roundEvals.length === 0) return null
        const avg =
          roundEvals.reduce((sum, e) => sum + evaluationScore(e), 0) / roundEvals.length
        return (
          <span
            key={r.key}
            className="chip chip--mono"
            title={`${r.title}: ${roundEvals.length} scorecard(s)`}
          >
            R{r.number} {avg.toFixed(1)}
          </span>
        )
      })}
    </>
  )
}

function Status({ status }: { status: Candidate['status'] }) {
  const tone =
    status === 'passed'
      ? 'chip--positive'
      : status === 'rejected'
        ? 'chip--negative'
        : status === 'on_hold'
          ? 'chip--warning'
          : 'chip--quiet'
  return <span className={`chip ${tone}`}>{statusLabel(status)}</span>
}
