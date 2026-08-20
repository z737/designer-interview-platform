/** Throwaway harness for eyeballing the real components with fixture data. */
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import CandidateTable from './components/CandidateTable'
import CandidateDrawer from './components/CandidateDrawer'
import { ROUNDS } from './config/rounds'
import type { BankQuestion, Candidate, Evaluation } from './lib/types'
import './index.css'

const candidates: Candidate[] = [
  { id: 'c1', email: 'anita@example.com', full_name: 'Anita Rao', role_title: 'Product Designer', source: 'Referral', portfolio_url: 'https://example.com', current_round: 2, status: 'in_progress', created_by_name: 'Abhijit', created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-10T10:00:00Z' },
  { id: 'c2', email: 'dev@example.com', full_name: 'Dev Kumar', role_title: 'Product Designer', source: 'LinkedIn', portfolio_url: null, current_round: 1, status: 'in_progress', created_by_name: 'Abhijit', created_at: '2026-08-03T10:00:00Z', updated_at: '2026-08-03T10:00:00Z' },
  { id: 'c3', email: 'meera@example.com', full_name: 'Meera Suresh', role_title: 'Product Designer', source: 'Careers page', portfolio_url: null, current_round: 2, status: 'passed', created_by_name: 'Abhijit', created_at: '2026-07-20T10:00:00Z', updated_at: '2026-08-12T10:00:00Z' },
  { id: 'c4', email: 'rahul@example.com', full_name: 'Rahul Jain', role_title: 'Product Designer', source: null, portfolio_url: null, current_round: 1, status: 'rejected', created_by_name: 'Abhijit', created_at: '2026-07-28T10:00:00Z', updated_at: '2026-08-02T10:00:00Z' },
  { id: 'c5', email: 'priya@example.com', full_name: 'Priya Nair', role_title: 'Product Designer', source: 'Referral', portfolio_url: null, current_round: 2, status: 'on_hold', created_by_name: 'Abhijit', created_at: '2026-08-05T10:00:00Z', updated_at: '2026-08-14T10:00:00Z' },
]

const evaluations: Evaluation[] = [
  { id: 'e1', candidate_id: 'c1', round_key: 'portfolio', round_number: 1, overall_score: 4, criteria_scores: { problem_understanding: 4, ownership: 5, visual_craft: 3, ux_thinking: 4 }, questions_asked: [{ prompt: 'Walk me through this project. What problem were you solving, and why did it matter to the business?', source: 'bank', criterion: 'problem_understanding', response_notes: 'Framed it as retention; cited a 12% drop-off at onboarding step 3.' }], notes: 'Strong ownership story — drove the problem definition herself. Visual craft is the weaker axis; spacing was inconsistent across the case study.', recommendation: 'advance', interviewer_name: 'Abhijit', submitted_at: '2026-08-05T12:00:00Z' },
  { id: 'e2', candidate_id: 'c1', round_key: 'portfolio', round_number: 1, overall_score: 4, criteria_scores: { ownership: 4 }, questions_asked: [], notes: 'Agreed on advance. Would probe AI workflows more in the whiteboard round.', recommendation: 'advance', interviewer_name: 'Harshita', submitted_at: '2026-08-05T13:00:00Z' },
  { id: 'e3', candidate_id: 'c3', round_key: 'portfolio', round_number: 1, overall_score: 5, criteria_scores: {}, questions_asked: [], notes: 'Exceptional.', recommendation: 'advance', interviewer_name: 'Abhijit', submitted_at: '2026-08-01T12:00:00Z' },
  { id: 'e4', candidate_id: 'c3', round_key: 'whiteboard', round_number: 2, overall_score: 4, criteria_scores: {}, questions_asked: [], notes: 'Clear framing, good tradeoff reasoning.', recommendation: 'advance', interviewer_name: 'Abhijit', submitted_at: '2026-08-12T12:00:00Z' },
  { id: 'e5', candidate_id: 'c4', round_key: 'portfolio', round_number: 1, overall_score: 2, criteria_scores: {}, questions_asked: [], notes: 'Could not separate own work from the team’s.', recommendation: 'reject', interviewer_name: 'Abhijit', submitted_at: '2026-08-02T12:00:00Z' },
  { id: 'e6', candidate_id: 'c5', round_key: 'portfolio', round_number: 1, overall_score: 3, criteria_scores: {}, questions_asked: [], notes: 'Mixed.', recommendation: 'advance', interviewer_name: 'Abhijit', submitted_at: '2026-08-08T12:00:00Z' },
]

const questionBank: BankQuestion[] = ROUNDS.flatMap((r) =>
  r.criteria.slice(0, 4).flatMap((c, i) => [
    { id: `${r.key}-${c.key}-a`, round_key: r.key, criterion: c.key, prompt: `${c.help}`, sort_order: i * 10, is_active: true },
    { id: `${r.key}-${c.key}-b`, round_key: r.key, criterion: c.key, prompt: `Follow-up on ${c.label.toLowerCase()} — what would you do differently today?`, sort_order: i * 10 + 1, is_active: true },
  ]),
)

function Preview() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = candidates.find((c) => c.id === selectedId) ?? null
  return (
    <div className="app">
      <main className="page">
        <div className="page-head">
          <h1 className="display flex-1">PD1 Candidates</h1>
          <button className="btn-primary">Add candidate</button>
        </div>
        <div className="row gap-16 wrap mb-24">
          <input className="input input--inline" style={{ maxWidth: 260 }} placeholder="Search name or email…" />
          <div className="row gap-8 wrap flex-1">
            <button className="btn-pill" aria-pressed={true}>All<span className="btn-pill__count">5</span></button>
            <button className="btn-pill">Active<span className="btn-pill__count">3</span></button>
            <button className="btn-pill">Role Fitment<span className="btn-pill__count">1</span></button>
            <button className="btn-pill">Whiteboard<span className="btn-pill__count">3</span></button>
            <button className="btn-pill">Closed<span className="btn-pill__count">1</span></button>
          </div>
          <span className="micro">5 of 5</span>
        </div>
        <CandidateTable candidates={candidates} evaluations={evaluations} selectedId={selectedId} onSelect={(c) => setSelectedId(c.id)} onDelete={(c) => alert(`delete ${c.full_name} (preview)`)} onExportRound={(c, k) => alert(`export ${c.full_name} ${k} (preview)`)} />
      </main>
      {selected && (
        <CandidateDrawer
          candidate={selected}
          evaluations={evaluations.filter((e) => e.candidate_id === selected.id)}
          questionBank={questionBank}
          onClose={() => setSelectedId(null)}
          onSubmit={async () => { alert('submitted (preview)') }}
          onExportRound={(k) => alert(`export ${k} (preview)`)}
        />
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>,
)
