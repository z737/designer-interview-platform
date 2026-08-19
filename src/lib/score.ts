import type { Round } from '../config/rounds'
import type { Evaluation } from './types'

/**
 * The overall score is derived, never typed in: it is the mean of the per-criterion
 * scores. `overall_score` in the database stores the rounded integer (its CHECK
 * constraint is 1-5), so anywhere a precise figure is shown we recompute the mean
 * from `criteria_scores` rather than reading the rounded column back.
 */
export function averageScore(criteriaScores: Record<string, number> | null | undefined): number | null {
  const values = Object.values(criteriaScores ?? {})
  if (values.length === 0) return null
  return values.reduce((sum, n) => sum + n, 0) / values.length
}

/** What gets written to the integer `overall_score` column. */
export function roundedScore(average: number): number {
  return Math.min(5, Math.max(1, Math.round(average)))
}

/** Precise mean for an evaluation, falling back to the stored integer for legacy rows. */
export function evaluationScore(evaluation: Evaluation): number {
  return averageScore(evaluation.criteria_scores) ?? evaluation.overall_score
}

export function scoredCount(
  round: Round,
  criteriaScores: Record<string, number>,
): { scored: number; total: number; complete: boolean } {
  const total = round.criteria.length
  const scored = round.criteria.filter((c) => criteriaScores[c.key] != null).length
  return { scored, total, complete: scored === total }
}
