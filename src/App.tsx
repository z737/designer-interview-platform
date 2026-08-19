import { useCallback, useEffect, useMemo, useState } from 'react'
import CandidateTable from './components/CandidateTable'
import AddCandidateModal from './components/AddCandidateModal'
import CandidateDrawer from './components/CandidateDrawer'
import { configError } from './lib/supabase'
import {
  addCandidate,
  deleteCandidate,
  fetchCandidates,
  fetchEvaluations,
  fetchQuestionBank,
  submitEvaluation,
  type EvaluationDraft,
} from './lib/api'
import { buildRepoZip } from './lib/exportRepo'
import { buildRoundReport, downloadBlob } from './lib/reportPdf'
import { roundByKey } from './config/rounds'
import { useInterviewer } from './lib/useInterviewer'
import { errorMessage } from './lib/errors'
import { ROUNDS } from './config/rounds'
import type { BankQuestion, Candidate, Evaluation, NewCandidate } from './lib/types'

type Filter = 'all' | 'active' | 'closed' | number

/** Single source of truth for both the visible list and the chip counts. */
function matchesFilter(c: Candidate, filter: Filter): boolean {
  if (filter === 'active') return c.status === 'in_progress' || c.status === 'on_hold'
  if (filter === 'closed') return c.status === 'rejected' || c.status === 'withdrawn'
  if (typeof filter === 'number')
    return c.current_round === filter && c.status !== 'rejected' && c.status !== 'withdrawn'
  return true
}

export default function App() {
  if (configError) {
    return (
      <div className="setup">
        <div className="setup__inner">
          <p className="mono-label">Setup</p>
          <h1 className="display mt-16">Almost there</h1>
          <div className="notice notice--warning mt-24">{configError}</div>
          <p className="caption mt-16">
            See <span className="mono">README.md</span> for the two-minute Supabase setup.
          </p>
        </div>
      </div>
    )
  }
  return <Dashboard />
}

function Dashboard() {
  const { name: interviewer, setName: setInterviewer } = useInterviewer()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [questionBank, setQuestionBank] = useState<BankQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, e, q] = await Promise.all([
        fetchCandidates(),
        fetchEvaluations(),
        fetchQuestionBank(),
      ])
      setCandidates(c)
      setEvaluations(e)
      setQuestionBank(q)
    } catch (err) {
      setError(
        `${errorMessage(err, 'Could not load data.')} — if the tables are missing, run supabase/setup.sql in the Supabase SQL editor.`,
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const selected = candidates.find((c) => c.id === selectedId) ?? null

  // Counts sit on the chips, so they are computed from the search-matched set —
  // otherwise a chip could read "3" while the filtered list shows nothing.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter((c) =>
      `${c.username} ${c.email} ${c.full_name ?? ''}`.toLowerCase().includes(q),
    )
  }, [candidates, query])

  const visible = useMemo(
    () => searched.filter((c) => matchesFilter(c, filter)),
    [searched, filter],
  )

  async function handleAdd(input: NewCandidate) {
    const created = await addCandidate(input, interviewer)
    setCandidates((prev) => [created, ...prev])
    setToast(`${created.username} added to round 1.`)
  }

  const handleSubmitEvaluation = useCallback(
    async (draft: EvaluationDraft) => {
      const candidate = candidates.find((c) => c.id === draft.candidateId)
      if (!candidate) throw new Error('Candidate not found — reload and try again.')

      const { evaluation, candidate: updated } = await submitEvaluation(draft, candidate)

      setEvaluations((prev) => [...prev.filter((e) => e.id !== evaluation.id), evaluation])
      setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))

      const movedTo =
        updated.current_round !== candidate.current_round ? updated.current_round : null
      setToast(
        draft.recommendation === 'reject'
          ? `${candidate.username} marked as not proceeding.`
          : movedTo
            ? `Saved. ${candidate.username} moved to round ${movedTo}.`
            : 'Scorecard saved.',
      )
    },
    [candidates],
  )

  async function handleDelete(candidate: Candidate) {
    const label = candidate.full_name || candidate.username
    const scorecards = evaluations.filter((e) => e.candidate_id === candidate.id).length
    const warning =
      scorecards > 0
        ? `\n\nThis also deletes ${scorecards} scorecard${scorecards === 1 ? '' : 's'}. Export a report first if you need the record.`
        : ''
    if (!window.confirm(`Delete ${label} permanently?${warning}`)) return

    try {
      await deleteCandidate(candidate.id)
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id))
      setEvaluations((prev) => prev.filter((e) => e.candidate_id !== candidate.id))
      if (selectedId === candidate.id) setSelectedId(null)
      setToast(`${label} deleted.`)
    } catch (err) {
      setError(errorMessage(err, 'Could not delete candidate.'))
    }
  }

  async function handleExportRound(candidate: Candidate, roundKey: string) {
    const round = roundByKey(roundKey)
    if (!round) return
    const roundEvals = evaluations.filter(
      (e) => e.candidate_id === candidate.id && e.round_key === roundKey,
    )
    if (roundEvals.length === 0) {
      setError(`No scorecard submitted for round ${round.number} yet.`)
      return
    }
    try {
      const { blob, filename } = await buildRoundReport({
        candidate,
        round,
        evaluations: roundEvals,
        questionBank,
        now: new Date(),
      })
      downloadBlob(blob, filename)
      setToast(`Downloaded ${filename}`)
    } catch (err) {
      setError(errorMessage(err, 'Could not build the report.'))
    }
  }

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      const { blob, filename } = await buildRepoZip({
        candidates,
        evaluations,
        questionBank,
        exportedBy: interviewer.trim() || 'unattributed',
        now: new Date(),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setToast(`Downloaded ${filename}`)
    } catch (err) {
      setError(errorMessage(err, 'Export failed.'))
    } finally {
      setExporting(false)
    }
  }

  const filterDefs: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    ...ROUNDS.map((r) => ({ value: r.number as Filter, label: r.shortTitle })),
    { value: 'closed', label: 'Closed' },
  ]
  const filters = filterDefs.map((f) => ({
    ...f,
    count: searched.filter((c) => matchesFilter(c, f.value)).length,
  }))

  return (
    <div className="app">
      <header className="topbar">
        <span className="wordmark">Product Designer Interviews</span>
        <span className="topbar__spacer" />
        <button
          className="btn-text btn-text--sm"
          onClick={() => void handleExport()}
          disabled={exporting || candidates.length === 0}
        >
          {exporting ? 'Packaging…' : 'Download repository'}
        </button>
        <label className="mono-label" htmlFor="interviewer-name">
          You
        </label>
        <input
          id="interviewer-name"
          className="input input--inline"
          style={{ width: 160 }}
          placeholder="Your name"
          value={interviewer}
          onChange={(e) => setInterviewer(e.target.value)}
          title="Attributes your scorecards. Stored in this browser only."
        />
      </header>

      <main className="page">
        <div className="page-head">
          <h1 className="display flex-1">Pipeline</h1>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            Add candidate
          </button>
        </div>

        {error && <div className="notice notice--error mb-24">{error}</div>}

        {!interviewer.trim() && !loading && candidates.length > 0 && (
          <div className="notice notice--warning mb-24">
            Add your name in the top bar so your scorecards are attributable.
          </div>
        )}

        <div className="row gap-16 wrap mb-24">
          <input
            className="input input--inline"
            style={{ maxWidth: 260 }}
            placeholder="Search name, username, or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="row gap-8 wrap flex-1">
            {filters.map((f) => (
              <button
                key={String(f.value)}
                className="btn-pill"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
                <span className="btn-pill__count">{f.count}</span>
              </button>
            ))}
          </div>
          <span className="micro">
            {loading ? 'Loading…' : `${visible.length} of ${candidates.length}`}
          </span>
        </div>

        <CandidateTable
          candidates={visible}
          evaluations={evaluations}
          selectedId={selectedId}
          onSelect={(c) => setSelectedId(c.id)}
          onDelete={handleDelete}
          onExportRound={(c, k) => void handleExportRound(c, k)}
        />

        <p className="micro mt-32" style={{ maxWidth: '68ch' }}>
          Confidential — candidate records are personal data under the DPDP Act. This app has no
          sign-in, so keep it on localhost or behind your VPN, and delete exports once the hiring
          decision is closed.
        </p>
      </main>

      {showAdd && <AddCandidateModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}

      {selected && (
        <CandidateDrawer
          candidate={selected}
          evaluations={evaluations.filter((e) => e.candidate_id === selected.id)}
          questionBank={questionBank}
          interviewerName={interviewer}
          onClose={() => setSelectedId(null)}
          onSubmit={handleSubmitEvaluation}
          onExportRound={(roundKey) => void handleExportRound(selected, roundKey)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
