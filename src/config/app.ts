/**
 * Scorecards still need a non-null `interviewer_name` (the column is NOT NULL and
 * the unique index is keyed on it), but the app no longer asks who is filling the
 * form — anyone can. Everything is recorded under this single name.
 *
 * Consequence: because the unique index is
 * (candidate_id, round_key, lower(interviewer_name)), there is now exactly one
 * scorecard per candidate per round. Submitting again updates it in place.
 */
export const RECORDED_BY = 'Gnani'
