/**
 * The interview pipeline, in one place.
 *
 * Criteria and objectives are taken verbatim in spirit from "Product Designer
 * Interview Process and Evaluation Guide". To add the guide's Round 3 (Final
 * Discussion), append an entry to ROUNDS and seed its questions with a new
 * migration using the same `key` — nothing else in the app needs to change.
 */

export type Criterion = {
  key: string
  label: string
  /** Shown as the hint under the criterion while scoring. */
  help: string
}

export type Round = {
  /** Stable identifier stored in the database. Never rename after go-live. */
  key: string
  number: number
  title: string
  shortTitle: string
  interviewers: string
  objective: string
  /** Guidance the interviewer sees before they start scoring. */
  guidance?: string
  criteria: Criterion[]
}

export const ROUNDS: Round[] = [
  {
    key: 'portfolio',
    number: 1,
    title: 'Portfolio / Case-Study Review',
    shortTitle: 'Portfolio',
    interviewers: 'Abhijit and Harshita',
    objective:
      "Understand the candidate's previous work, level of ownership, design ability, and relevance to the role.",
    guidance:
      'Judge demonstrated experience, not presentation polish. Push for what they personally owned.',
    criteria: [
      {
        key: 'problem_understanding',
        label: 'Problem understanding',
        help: 'Can they clearly explain the problem they were solving and why it mattered?',
      },
      {
        key: 'ownership',
        label: 'Ownership',
        help: 'What did they personally own versus what was handled by PMs, engineers, or other designers?',
      },
      {
        key: 'user_understanding',
        label: 'User understanding',
        help: 'Do they understand the users, their goals, pain points, and context?',
      },
      {
        key: 'product_thinking',
        label: 'Product thinking',
        help: 'Can they connect design decisions with user and business outcomes?',
      },
      {
        key: 'ux_thinking',
        label: 'UX thinking',
        help: 'How well do they handle flows, information hierarchy, complexity, states, and edge cases?',
      },
      {
        key: 'visual_craft',
        label: 'Visual craft',
        help: 'Quality of hierarchy, typography, spacing, consistency, and interaction design.',
      },
      {
        key: 'research_validation',
        label: 'Research and validation',
        help: 'What evidence informed their decisions, and how did testing influence the solution?',
      },
      {
        key: 'collaboration',
        label: 'Collaboration',
        help: 'How do they work with PMs, engineers, and other stakeholders?',
      },
      {
        key: 'ai_workflows',
        label: 'AI workflows',
        help: 'How do they use AI for research, exploration, prototyping, audits, or other parts of their process?',
      },
      {
        key: 'self_awareness',
        label: 'Self-awareness',
        help: 'Can they identify weaknesses in their own work and explain what they would improve today?',
      },
    ],
  },
  {
    key: 'whiteboard',
    number: 2,
    title: 'Online Whiteboarding',
    shortTitle: 'Whiteboard',
    interviewers: 'One PM + one designer (Abhijit, Harshita, Mayank, or Harshit)',
    objective:
      'Understand how the candidate approaches an unfamiliar and ambiguous product problem without a prepared solution.',
    guidance:
      'The quality of the final wireframe is less important than the thinking process.',
    criteria: [
      {
        key: 'problem_framing',
        label: 'Problem framing',
        help: 'Do they understand the problem before jumping into solutions?',
      },
      {
        key: 'clarifying_questions',
        label: 'Clarifying questions',
        help: 'Do they ask about users, goals, constraints, context, and business objectives?',
      },
      {
        key: 'assumptions',
        label: 'Assumptions',
        help: 'Can they identify what they know versus what they are assuming?',
      },
      {
        key: 'prioritization',
        label: 'Prioritization',
        help: 'Can they focus on the most important problem instead of trying to solve everything?',
      },
      {
        key: 'user_journey',
        label: 'User journey',
        help: 'Can they think through the complete experience, not just individual screens?',
      },
      {
        key: 'information_architecture',
        label: 'Information architecture',
        help: 'Can they organize complex information clearly?',
      },
      {
        key: 'tradeoffs',
        label: 'Tradeoffs',
        help: 'Can they explain why they chose one approach over another?',
      },
      {
        key: 'edge_cases',
        label: 'Edge cases',
        help: 'Do they consider errors, empty states, failures, different user types, and scale?',
      },
      {
        key: 'collaboration',
        label: 'Collaboration',
        help: 'Do they engage with the PM and designer as partners during the exercise?',
      },
      {
        key: 'communication',
        label: 'Communication',
        help: 'Can they clearly explain their thinking while working through the problem?',
      },
    ],
  },
]

export const SCORE_LABELS: Record<number, string> = {
  1: 'Strong no — well below the bar',
  2: 'No — noticeable gaps',
  3: 'Mixed — meets some of the bar',
  4: 'Yes — clearly meets the bar',
  5: 'Strong yes — exceptional',
}

export const RECOMMENDATIONS = [
  { value: 'advance', label: 'Advance', help: 'Move to the next round' },
  { value: 'hold', label: 'Hold', help: 'Needs discussion before deciding' },
  { value: 'reject', label: 'Do not proceed', help: 'Ends the process' },
] as const

export const FINAL_ROUND_NUMBER = ROUNDS[ROUNDS.length - 1].number

export function roundByNumber(n: number): Round | undefined {
  return ROUNDS.find((r) => r.number === n)
}

export function roundByKey(key: string): Round | undefined {
  return ROUNDS.find((r) => r.key === key)
}
