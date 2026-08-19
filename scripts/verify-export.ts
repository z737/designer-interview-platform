/**
 * Smoke test for the repository export. Runs the real buildRepoZip() against
 * fixture data and prints the resulting file tree plus a couple of samples.
 *
 *   npx tsx scripts/verify-export.ts
 */
import { writeFileSync } from 'node:fs'
import JSZip from 'jszip'
import { buildRepoZip } from '../src/lib/exportRepo'
import type { BankQuestion, Candidate, Evaluation } from '../src/lib/types'

const candidates: Candidate[] = [
  {
    id: 'c1',
    username: 'anita.r',
    email: 'anita@example.com',
    full_name: 'Anita Rao',
    role_title: 'Product Designer',
    source: 'Referral',
    portfolio_url: 'https://example.com/anita',
    current_round: 2,
    status: 'in_progress',
    created_by_name: 'Abhijit',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-10T10:00:00Z',
  },
  {
    id: 'c2',
    username: '=cmd|calc',
    email: 'inject@example.com',
    full_name: null,
    role_title: 'Product Designer',
    source: null,
    portfolio_url: null,
    current_round: 1,
    status: 'rejected',
    created_by_name: 'Abhijit',
    created_at: '2026-08-02T10:00:00Z',
    updated_at: '2026-08-02T10:00:00Z',
  },
]

const evaluations: Evaluation[] = [
  {
    id: 'e1',
    candidate_id: 'c1',
    round_key: 'portfolio',
    round_number: 1,
    overall_score: 4,
    criteria_scores: { problem_understanding: 4, ownership: 5, visual_craft: 3 },
    questions_asked: [
      {
        prompt: 'Walk me through this project. What problem were you solving?',
        source: 'bank',
        criterion: 'problem_understanding',
        response_notes: 'Framed it as a retention problem.\nCited a 12% drop-off.',
      },
      {
        prompt: 'How did you scope the MVP?',
        source: 'custom',
        criterion: null,
        response_notes: 'Cut the admin flow entirely.',
      },
    ],
    notes: 'Strong ownership story. Visual craft is the weaker axis, "quoted" text included.',
    recommendation: 'advance',
    interviewer_name: 'Abhijit',
    submitted_at: '2026-08-05T12:00:00Z',
  },
  {
    id: 'e2',
    candidate_id: 'c2',
    round_key: 'portfolio',
    round_number: 1,
    overall_score: 2,
    criteria_scores: { problem_understanding: 2 },
    questions_asked: [],
    notes: 'Could not articulate the problem.',
    recommendation: 'reject',
    interviewer_name: 'Abhijit',
    submitted_at: '2026-08-06T12:00:00Z',
  },
]

const questionBank: BankQuestion[] = [
  {
    id: 'q1',
    round_key: 'portfolio',
    criterion: 'problem_understanding',
    prompt: 'Walk me through this project. What problem were you solving?',
    sort_order: 10,
    is_active: true,
  },
  {
    id: 'q2',
    round_key: 'whiteboard',
    criterion: 'problem_framing',
    prompt: 'How would you restate this problem in your own words?',
    sort_order: 10,
    is_active: true,
  },
]

const { blob, filename } = await buildRepoZip({
  candidates,
  evaluations,
  questionBank,
  exportedBy: 'Abhijit',
  now: new Date('2026-08-19T09:00:00Z'),
})

const buffer = Buffer.from(await blob.arrayBuffer())
writeFileSync('/tmp/export-check.zip', buffer)

const zip = await JSZip.loadAsync(buffer)
console.log(`archive: ${filename} (${buffer.length} bytes)\n`)
console.log('--- file tree ---')
Object.keys(zip.files)
  .filter((p) => !zip.files[p].dir)
  .sort()
  .forEach((p) => console.log('  ' + p))

async function show(path: string, lines = 14) {
  const file = zip.file(path)
  if (!file) return console.log(`\n!! MISSING ${path}`)
  const text = await file.async('string')
  console.log(`\n--- ${path} ---`)
  console.log(text.split('\n').slice(0, lines).join('\n'))
}

await show('designer-interviews-2026-08-19/candidates/anita-r/round-1-portfolio.md', 30)
await show('designer-interviews-2026-08-19/data/candidates.csv')
await show('designer-interviews-2026-08-19/data/criteria-scores.csv')
