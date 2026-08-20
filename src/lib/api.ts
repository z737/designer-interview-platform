import { supabase } from './supabase'
import { FINAL_ROUND_NUMBER, roundByKey } from '../config/rounds'
import type {
  BankQuestion,
  Candidate,
  CandidateStatus,
  Evaluation,
  NewCandidate,
  Recommendation,
  AskedQuestion,
} from './types'

export async function fetchCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Candidate[]
}

export async function fetchEvaluations(): Promise<Evaluation[]> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .order('submitted_at', { ascending: true })
  if (error) throw error
  return data as Evaluation[]
}

export async function fetchQuestionBank(): Promise<BankQuestion[]> {
  const { data, error } = await supabase
    .from('question_bank')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data as BankQuestion[]
}

/** Shared field mapping so add and edit cannot drift apart. */
function candidateFields(input: NewCandidate) {
  return {
    full_name: input.full_name.trim(),
    email: input.email.trim().toLowerCase(),
    source: input.source?.trim() || null,
    portfolio_url: input.portfolio_url?.trim() || null,
  }
}

/** Email is the unique key, so a collision is the one error worth naming. */
function candidateError(error: { code?: string }): Error | null {
  if (error.code === '23505') return new Error('A candidate with that email already exists.')
  if (error.code === '23514') return new Error('Full name cannot be blank.')
  return null
}

export async function addCandidate(
  input: NewCandidate,
  addedBy: string,
): Promise<Candidate> {
  const { data, error } = await supabase
    .from('candidates')
    .insert({ ...candidateFields(input), created_by_name: addedBy.trim() || null })
    .select()
    .single()

  if (error) throw candidateError(error) ?? error
  return data as Candidate
}

/**
 * Edits basic details only. Round and status are driven by the pipeline, so they
 * are deliberately not editable here — advancing happens by submitting a
 * scorecard, not by hand.
 */
export async function updateCandidate(
  candidateId: string,
  input: NewCandidate,
): Promise<Candidate> {
  const { data, error } = await supabase
    .from('candidates')
    .update(candidateFields(input))
    .eq('id', candidateId)
    .select()
    .single()

  if (error) throw candidateError(error) ?? error
  return data as Candidate
}

export type EvaluationDraft = {
  candidateId: string
  roundKey: string
  overallScore: number
  criteriaScores: Record<string, number>
  questionsAsked: AskedQuestion[]
  notes: string
  recommendation: Recommendation
  interviewerName: string
}

/**
 * Saves the interviewer's scorecard and moves the candidate to wherever the
 * recommendation says they should go.
 *
 * Advancement is deliberately conservative: it only ever moves a candidate
 * forward from the round they are *currently* on. Editing an older round's
 * scorecard corrects the record without rewinding or double-advancing anyone.
 */
export async function submitEvaluation(
  draft: EvaluationDraft,
  candidate: Candidate,
): Promise<{ evaluation: Evaluation; candidate: Candidate }> {
  const round = roundByKey(draft.roundKey)
  if (!round) throw new Error(`Unknown round: ${draft.roundKey}`)

  const interviewerName = draft.interviewerName.trim()
  if (!interviewerName) throw new Error('Enter your name so the scorecard is attributable.')

  // The unique index is on lower(interviewer_name), which onConflict cannot
  // target by name, so resolve an existing row by hand and update it.
  const { data: prior, error: priorError } = await supabase
    .from('evaluations')
    .select('id')
    .eq('candidate_id', draft.candidateId)
    .eq('round_key', draft.roundKey)
    .ilike('interviewer_name', interviewerName)
    .maybeSingle()
  if (priorError) throw priorError

  const row = {
    candidate_id: draft.candidateId,
    round_key: draft.roundKey,
    round_number: round.number,
    overall_score: draft.overallScore,
    criteria_scores: draft.criteriaScores,
    questions_asked: draft.questionsAsked,
    notes: draft.notes,
    recommendation: draft.recommendation,
    interviewer_name: interviewerName,
    submitted_at: new Date().toISOString(),
  }

  const query = prior
    ? supabase.from('evaluations').update(row).eq('id', prior.id)
    : supabase.from('evaluations').insert(row)

  const { data: evalRow, error: evalError } = await query.select().single()
  if (evalError) throw evalError

  const next = nextPipelineState(candidate, round.number, draft.recommendation)

  let updated = candidate
  if (next) {
    const { data, error } = await supabase
      .from('candidates')
      .update(next)
      .eq('id', candidate.id)
      .select()
      .single()
    if (error) throw error
    updated = data as Candidate
  }

  return { evaluation: evalRow as Evaluation, candidate: updated }
}

/** Returns the candidate fields to change, or null if nothing should move. */
function nextPipelineState(
  candidate: Candidate,
  roundNumber: number,
  recommendation: Recommendation,
): { current_round: number; status: CandidateStatus } | null {
  // A reject is decisive whichever round it comes from.
  if (recommendation === 'reject') {
    if (candidate.status === 'rejected') return null
    return { current_round: candidate.current_round, status: 'rejected' }
  }

  // Only the round the candidate is actually on can move them.
  if (roundNumber !== candidate.current_round) return null

  if (recommendation === 'hold') {
    if (candidate.status === 'on_hold') return null
    return { current_round: candidate.current_round, status: 'on_hold' }
  }

  // advance
  if (roundNumber >= FINAL_ROUND_NUMBER) {
    return { current_round: candidate.current_round, status: 'passed' }
  }
  return { current_round: roundNumber + 1, status: 'in_progress' }
}

export async function updateCandidateStatus(
  candidateId: string,
  status: CandidateStatus,
): Promise<Candidate> {
  const { data, error } = await supabase
    .from('candidates')
    .update({ status })
    .eq('id', candidateId)
    .select()
    .single()
  if (error) throw error
  return data as Candidate
}

/**
 * Hard delete. `evaluations.candidate_id` is ON DELETE CASCADE, so every
 * scorecard for this candidate goes with them — the UI confirms first.
 */
export async function deleteCandidate(candidateId: string): Promise<void> {
  const { error } = await supabase.from('candidates').delete().eq('id', candidateId)
  if (error) throw error
}
