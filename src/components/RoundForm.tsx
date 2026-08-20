import { useMemo, useState } from 'react'
import ScoreScale from './ScoreScale'
import { RECOMMENDATIONS, SCORE_LABELS, type Round } from '../config/rounds'
import type { BankQuestion, Evaluation, Recommendation } from '../lib/types'
import type { EvaluationDraft } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { averageScore, roundedScore, scoredCount } from '../lib/score'
import { RECORDED_BY } from '../config/app'

type Props = {
  round: Round
  candidateId: string
  questionBank: BankQuestion[]
  /** This interviewer's existing scorecard for this round, if they already submitted. */
  existing: Evaluation | null
  /** True when the candidate has not reached this round yet. */
  locked: boolean
  onSubmit: (draft: EvaluationDraft) => Promise<void>
  /** Available once this round has at least one submitted scorecard. */
  onExportReport: () => void
}

export default function RoundForm({
  round,
  candidateId,
  questionBank,
  existing,
  locked,
  onSubmit,
  onExportReport,
}: Props) {
  const [criteria, setCriteria] = useState<Record<string, number>>(existing?.criteria_scores ?? {})
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    existing?.recommendation ?? null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bank = useMemo(
    () => questionBank.filter((q) => q.round_key === round.key),
    [questionBank, round.key],
  )

  // Overall is derived from the criteria, never typed in.
  const average = averageScore(criteria)
  const { scored, total, complete } = scoredCount(round, criteria)

  const canSubmit = complete && recommendation !== null && notes.trim().length > 0

  // A report only makes sense once something has been submitted for this round.
  const roundHasScorecard = !!existing

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || average === null || recommendation === null) return
    setError(null)
    setBusy(true)
    try {
      await onSubmit({
        candidateId,
        roundKey: round.key,
        overallScore: roundedScore(average),
        criteriaScores: criteria,
        questionsAsked: [],
        notes: notes.trim(),
        recommendation,
        interviewerName: RECORDED_BY,
      })
    } catch (err) {
      setError(errorMessage(err, 'Could not submit scorecard.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ------------------------------------------------------- briefing */}
      <div className="brief">
        <p className="mono-label">Interviewers · {round.interviewers}</p>
        <p className="body-large mt-8">{round.objective}</p>
        {round.guidance && <p className="brief__guidance">{round.guidance}</p>}
      </div>

      {locked && (
        <div className="notice notice--warning mt-16">
          This candidate has not reached this round yet. You can still record a scorecard, but it
          will not move them forward until they are on this round.
        </div>
      )}

      {existing && (
        <div className="notice notice--info mt-16">
          This round was scored on {new Date(existing.submitted_at).toLocaleString()}. Saving
          again updates the scorecard in place.
        </div>
      )}

      {/* --------------------------------------------- suggested questions */}
      {bank.length > 0 && (
        <details className="disclosure mt-24">
          <summary className="disclosure__summary">
            <span className="mono-label">Suggested questions</span>
            <span className="caption">{bank.length} prompts · reference only</span>
          </summary>
          <div className="disclosure__body">
            {round.criteria.map((c) => {
              const qs = bank.filter((q) => q.criterion === c.key)
              if (qs.length === 0) return null
              return (
                <div className="question-group" key={c.key}>
                  <div className="question-group__label mono-label">{c.label}</div>
                  <ul className="suggested">
                    {qs.map((q) => (
                      <li key={q.id}>{q.prompt}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </details>
      )}

      {(round.signals || round.notEvaluated) && (
        <details className="disclosure">
          <summary className="disclosure__summary">
            <span className="mono-label">What to look for</span>
          </summary>
          <div className="disclosure__body">
            {round.signals && (
              <div className="question-group">
                <div className="question-group__label mono-label">Additional signals</div>
                <ul className="suggested">
                  {round.signals.map((sig) => (
                    <li key={sig}>{sig}</li>
                  ))}
                </ul>
              </div>
            )}
            {round.notEvaluated && (
              <div className="question-group">
                <div className="question-group__label mono-label">Do not weigh heavily</div>
                <ul className="suggested">
                  {round.notEvaluated.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* ------------------------------------------------------- criteria */}
      <section className="block">
        <div className="block__head">
          <span className="mono-label">Evaluation criteria</span>
          <span className="caption">
            {scored} of {total} scored
          </span>
        </div>
        {round.criteria.map((c) => (
          <div className="score-row" key={c.key}>
            <div className="score-row__label">
              <div className="score-row__title">{c.label}</div>
              <div className="score-row__help">{c.help}</div>
            </div>
            <ScoreScale
              label={c.label}
              value={criteria[c.key] ?? null}
              onChange={(v) =>
                setCriteria((prev) => {
                  const next = { ...prev }
                  if (v === null) delete next[c.key]
                  else next[c.key] = v
                  return next
                })
              }
            />
          </div>
        ))}
      </section>

      {/* -------------------------------------------------------- verdict */}
      <section className="block">
        <div className="block__head">
          <span className="mono-label">Overall</span>
        </div>

        <div className="stack gap-24">
          <div className="derived">
            <div className="derived__figure">
              {average === null ? '—' : average.toFixed(1)}
              <span className="derived__of">/ 5</span>
            </div>
            <div>
              <div className="derived__title">
                {average === null
                  ? 'Score the criteria above'
                  : (SCORE_LABELS[Math.round(average)] ?? '')}
              </div>
              {!complete && (
                <div className="caption">
                  {total - scored} criteri{total - scored === 1 ? 'on' : 'a'} left to score.
                </div>
              )}
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`notes-${round.key}`}>
              Notes &amp; feedback <span className="req">*</span>
            </label>
            <textarea
              id={`notes-${round.key}`}
              className="textarea"
              style={{ minHeight: 176 }}
              placeholder="What you observed: strengths, gaps, and anything the next round should probe."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="field">
            <span className="field__label">
              Recommendation <span className="req">*</span>
            </span>
            <div className="row gap-8 wrap">
              {RECOMMENDATIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className="btn-pill"
                  title={r.help}
                  aria-pressed={recommendation === r.value}
                  onClick={() => setRecommendation(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="notice notice--error">{error}</div>}

          <div className="row gap-24 wrap">
            <button type="submit" className="btn-primary" disabled={!canSubmit || busy}>
              {busy ? 'Submitting…' : existing ? 'Update scorecard' : 'Submit & advance'}
            </button>
            {roundHasScorecard && (
              <button type="button" className="btn-text" onClick={onExportReport}>
                Export report (PDF)
              </button>
            )}
            {!canSubmit && (
              <span className="caption">
                {!complete
                  ? `Score all ${total} criteria — the overall score is calculated from them.`
                  : 'Notes and a recommendation are required.'}
              </span>
            )}
          </div>
        </div>
      </section>

    </form>
  )
}
