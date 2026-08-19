import JSZip from 'jszip'
import { ROUNDS, SCORE_LABELS, roundByKey } from '../config/rounds'
import { evaluationScore } from './score'
import type { BankQuestion, Candidate, Evaluation } from './types'

/**
 * Builds a downloadable, git-ready repository of everything the panel recorded:
 * the round definitions, the questions actually asked, and every score.
 *
 * Two representations on purpose — Markdown for humans reading a candidate's
 * file, CSV/JSON for anyone who wants to calibrate scores in a spreadsheet.
 */

type ExportInput = {
  candidates: Candidate[]
  evaluations: Evaluation[]
  questionBank: BankQuestion[]
  /** Only export these candidates; omit for all. */
  candidateIds?: string[]
  exportedBy: string
  /** Injected so the caller controls the timestamp (and tests stay stable). */
  now: Date
}

export async function buildRepoZip(input: ExportInput): Promise<{ blob: Blob; filename: string }> {
  const { questionBank, exportedBy, now } = input
  const stamp = now.toISOString().slice(0, 10)

  const candidates = input.candidateIds?.length
    ? input.candidates.filter((c) => input.candidateIds!.includes(c.id))
    : input.candidates
  const candidateIdSet = new Set(candidates.map((c) => c.id))
  const evaluations = input.evaluations.filter((e) => candidateIdSet.has(e.candidate_id))

  const root = `designer-interviews-${stamp}`
  const zip = new JSZip()
  const folder = zip.folder(root)!

  folder.file('README.md', repoReadme({ candidates, evaluations, exportedBy, now }))
  folder.file('.gitignore', '.DS_Store\nnode_modules\n')

  // --- Round definitions + question bank ---------------------------------
  for (const round of ROUNDS) {
    const bank = questionBank.filter((q) => q.round_key === round.key)
    folder.file(`rounds/round-${round.number}-${round.key}.md`, roundDoc(round, bank))
  }
  folder.file('rounds/question-bank.json', JSON.stringify(questionBank, null, 2))
  folder.file(
    'rounds/rounds.json',
    JSON.stringify(
      ROUNDS.map((r) => ({
        key: r.key,
        number: r.number,
        title: r.title,
        interviewers: r.interviewers,
        objective: r.objective,
        criteria: r.criteria.map((c) => ({ key: c.key, label: c.label, help: c.help })),
      })),
      null,
      2,
    ),
  )

  // --- Per-candidate files ------------------------------------------------
  // Usernames are unique in the DB, but slugging can collide ("anita.r" and
  // "anita_r" both become "anita-r"), which would silently overwrite a folder.
  const usedDirs = new Map<string, number>()
  for (const candidate of candidates) {
    const base = slug(candidate.username)
    const seen = usedDirs.get(base) ?? 0
    usedDirs.set(base, seen + 1)
    const dir = `candidates/${seen === 0 ? base : `${base}-${seen + 1}`}`
    const own = evaluations.filter((e) => e.candidate_id === candidate.id)

    folder.file(`${dir}/candidate.json`, JSON.stringify({ ...candidate, evaluations: own }, null, 2))
    folder.file(`${dir}/README.md`, candidateSummary(candidate, own))

    for (const round of ROUNDS) {
      const roundEvals = own.filter((e) => e.round_key === round.key)
      if (roundEvals.length === 0) continue
      folder.file(
        `${dir}/round-${round.number}-${round.key}.md`,
        candidateRoundDoc(candidate, round.key, roundEvals),
      )
    }
  }

  // --- Machine-readable data ---------------------------------------------
  folder.file('data/candidates.csv', candidatesCsv(candidates))
  folder.file('data/evaluations.csv', evaluationsCsv(evaluations))
  folder.file('data/criteria-scores.csv', criteriaScoresCsv(evaluations))
  folder.file('data/evaluations.json', JSON.stringify(evaluations, null, 2))
  folder.file('data/candidates.json', JSON.stringify(candidates, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, filename: `${root}.zip` }
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

function repoReadme(args: {
  candidates: Candidate[]
  evaluations: Evaluation[]
  exportedBy: string
  now: Date
}): string {
  const { candidates, evaluations, exportedBy, now } = args
  return [
    '# Product Designer Interviews — export',
    '',
    `Exported ${now.toISOString()} by ${exportedBy}.`,
    `${candidates.length} candidate(s), ${evaluations.length} scorecard(s).`,
    '',
    '## ⚠️ Confidential — contains personal data',
    '',
    'This archive contains candidate names, email addresses and interview notes.',
    'Under the DPDP Act that is personal data collected for a stated purpose.',
    'Keep it in a private repository or an access-controlled drive, do not forward it',
    'outside the hiring panel, and delete it once the hiring decision is closed and',
    'your retention period has lapsed.',
    '',
    '## Layout',
    '',
    '```',
    'rounds/                  Round definitions, criteria, and the full question bank',
    'candidates/<username>/   One folder per candidate: summary, raw JSON, per-round notes',
    'data/                    CSV + JSON for spreadsheets and analysis',
    '```',
    '',
    '## Make it a repository',
    '',
    '```bash',
    'git init && git add . && git commit -m "Interview export"',
    '```',
    '',
    '## Scoring scale',
    '',
    ...Object.entries(SCORE_LABELS).map(([n, label]) => `- **${n}** — ${label}`),
    '',
  ].join('\n')
}

function roundDoc(round: (typeof ROUNDS)[number], bank: BankQuestion[]): string {
  const lines = [
    `# Round ${round.number}: ${round.title}`,
    '',
    `**Interviewers:** ${round.interviewers}`,
    '',
    '## Objective',
    '',
    round.objective,
  ]
  if (round.guidance) lines.push('', `> ${round.guidance}`)

  lines.push('', '## What we evaluate', '')
  for (const c of round.criteria) lines.push(`- **${c.label}:** ${c.help}`)

  lines.push('', '## Question bank', '')
  for (const c of round.criteria) {
    const qs = bank.filter((q) => q.criterion === c.key)
    if (qs.length === 0) continue
    lines.push(`### ${c.label}`, '')
    for (const q of qs) lines.push(`- ${q.prompt}`)
    lines.push('')
  }
  const unlinked = bank.filter((q) => !round.criteria.some((c) => c.key === q.criterion))
  if (unlinked.length) {
    lines.push('### Other', '')
    for (const q of unlinked) lines.push(`- ${q.prompt}`)
    lines.push('')
  }
  return lines.join('\n')
}

function candidateSummary(candidate: Candidate, evals: Evaluation[]): string {
  const lines = [
    `# ${candidate.full_name || candidate.username}`,
    '',
    `- **Username:** ${candidate.username}`,
    `- **Email:** ${candidate.email}`,
    `- **Role:** ${candidate.role_title}`,
    `- **Current round:** ${currentRoundLabel(candidate)}`,
    `- **Status:** ${statusLabel(candidate.status)}`,
  ]
  if (candidate.source) lines.push(`- **Source:** ${candidate.source}`)
  if (candidate.portfolio_url) lines.push(`- **Portfolio:** ${candidate.portfolio_url}`)
  lines.push(`- **Added:** ${candidate.created_at}`, '')

  lines.push('## Scorecards', '')
  if (evals.length === 0) {
    lines.push('_No rounds scored yet._', '')
    return lines.join('\n')
  }

  lines.push('| Round | Interviewer | Overall | Recommendation | Submitted |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const e of evals) {
    const r = roundByKey(e.round_key)
    lines.push(
      `| ${e.round_number}. ${r?.shortTitle ?? e.round_key} | ${e.interviewer_name} | ${evaluationScore(e).toFixed(1)}/5 | ${e.recommendation} | ${e.submitted_at.slice(0, 10)} |`,
    )
  }
  lines.push('')
  return lines.join('\n')
}

function candidateRoundDoc(
  candidate: Candidate,
  roundKey: string,
  evals: Evaluation[],
): string {
  const round = roundByKey(roundKey)
  const lines = [
    `# ${candidate.full_name || candidate.username} — Round ${round?.number ?? '?'}: ${round?.title ?? roundKey}`,
    '',
  ]

  for (const e of evals) {
    lines.push(`## Scorecard — ${e.interviewer_name}`, '')
    lines.push(
      `**Overall:** ${evaluationScore(e).toFixed(1)}/5 (mean of the criteria below) — ${SCORE_LABELS[e.overall_score] ?? ''}`,
    )
    lines.push(`**Recommendation:** ${e.recommendation}`)
    lines.push(`**Submitted:** ${e.submitted_at}`, '')

    const scored = round?.criteria.filter((c) => e.criteria_scores?.[c.key] != null) ?? []
    if (scored.length) {
      lines.push('### Criteria', '', '| Criterion | Score |', '| --- | --- |')
      for (const c of scored) lines.push(`| ${c.label} | ${e.criteria_scores[c.key]}/5 |`)
      lines.push('')
    }

    if (e.questions_asked?.length) {
      lines.push('### Questions asked', '')
      for (const q of e.questions_asked) {
        lines.push(`- **${q.prompt}**${q.source === 'custom' ? ' _(ad hoc)_' : ''}`)
        if (q.response_notes?.trim()) {
          for (const line of q.response_notes.trim().split('\n')) lines.push(`  > ${line}`)
        }
      }
      lines.push('')
    }

    if (e.notes?.trim()) {
      lines.push('### Notes', '', e.notes.trim(), '')
    }
    lines.push('---', '')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  // Guard against CSV/formula injection when the file is opened in Excel or Sheets.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n')
}

function candidatesCsv(candidates: Candidate[]): string {
  return toCsv(
    ['username', 'full_name', 'email', 'role_title', 'current_round', 'current_round_title', 'status', 'source', 'portfolio_url', 'created_at'],
    candidates.map((c) => [
      c.username,
      c.full_name,
      c.email,
      c.role_title,
      c.current_round,
      currentRoundLabel(c),
      c.status,
      c.source,
      c.portfolio_url,
      c.created_at,
    ]),
  )
}

function evaluationsCsv(evaluations: Evaluation[]): string {
  return toCsv(
    ['candidate_id', 'round_number', 'round_key', 'interviewer_name', 'overall_score_mean', 'recommendation', 'questions_asked_count', 'notes', 'submitted_at'],
    evaluations.map((e) => [
      e.candidate_id,
      e.round_number,
      e.round_key,
      e.interviewer_name,
      evaluationScore(e).toFixed(2),
      e.recommendation,
      e.questions_asked?.length ?? 0,
      e.notes,
      e.submitted_at,
    ]),
  )
}

/** Long-format criterion scores — the shape you want for calibration pivots. */
function criteriaScoresCsv(evaluations: Evaluation[]): string {
  const rows: unknown[][] = []
  for (const e of evaluations) {
    const round = roundByKey(e.round_key)
    for (const [key, score] of Object.entries(e.criteria_scores ?? {})) {
      const label = round?.criteria.find((c) => c.key === key)?.label ?? key
      rows.push([e.candidate_id, e.round_number, e.round_key, e.interviewer_name, key, label, score])
    }
  }
  return toCsv(
    ['candidate_id', 'round_number', 'round_key', 'interviewer_name', 'criterion_key', 'criterion_label', 'score'],
    rows,
  )
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function currentRoundLabel(candidate: Candidate): string {
  const round = ROUNDS.find((r) => r.number === candidate.current_round)
  if (!round) return `Round ${candidate.current_round}`
  return `${round.number}. ${round.shortTitle}`
}

export function statusLabel(status: Candidate['status']): string {
  return {
    in_progress: 'In progress',
    passed: 'Passed all rounds',
    rejected: 'Rejected',
    on_hold: 'On hold',
    withdrawn: 'Withdrawn',
  }[status]
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'candidate'
  )
}
