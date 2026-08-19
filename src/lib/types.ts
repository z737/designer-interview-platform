export type CandidateStatus =
  | 'in_progress'
  | 'passed'
  | 'rejected'
  | 'on_hold'
  | 'withdrawn'

export type Recommendation = 'advance' | 'hold' | 'reject'

export type Candidate = {
  id: string
  username: string
  email: string
  full_name: string | null
  role_title: string
  source: string | null
  portfolio_url: string | null
  current_round: number
  status: CandidateStatus
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export type AskedQuestion = {
  prompt: string
  /** 'bank' = picked from the seeded question bank, 'custom' = typed in the round. */
  source: 'bank' | 'custom'
  criterion: string | null
  response_notes: string
}

export type Evaluation = {
  id: string
  candidate_id: string
  round_key: string
  round_number: number
  overall_score: number
  criteria_scores: Record<string, number>
  questions_asked: AskedQuestion[]
  notes: string
  recommendation: Recommendation
  /** Self-declared — there are no accounts. Unique per candidate + round. */
  interviewer_name: string
  submitted_at: string
}

export type BankQuestion = {
  id: string
  round_key: string
  criterion: string | null
  prompt: string
  sort_order: number
  is_active: boolean
}

export type NewCandidate = {
  username: string
  email: string
  full_name?: string
  source?: string
  portfolio_url?: string
}
