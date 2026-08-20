/**
 * The interview pipeline, in one place.
 *
 * Content mirrors "Product Designer Interview Process and Evaluation Guide".
 * Criterion `key` values are stored in `evaluations.criteria_scores`, so renaming
 * one orphans existing scores — add a migration if you ever need to.
 */

export type Criterion = {
  key: string
  label: string
  /** The guide's definition of the criterion, shown while scoring. */
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
  /** Framing the guide adds beyond the objective. */
  guidance?: string
  criteria: Criterion[]
  /** "Additional signals" — softer things to watch for. */
  signals?: string[]
  /** "What we should not evaluate heavily". */
  notEvaluated?: string[]
}

export const ROUNDS: Round[] = [
  {
    key: 'portfolio',
    number: 1,
    title: 'Role Fitment and Past Experience',
    shortTitle: 'Role Fitment',
    interviewers: 'Abhijith and Harshita',
    objective:
      "Understand the candidate's previous work, level of ownership, design ability, and relevance to the role.",
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
        help: 'How do they use AI for research, exploration, prototyping, audits, or other parts of their design process?',
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
    interviewers: 'One PM + one designer from Abhijith, Harshita, Mayank, or Harshit',
    objective:
      'Understand how the candidate approaches an unfamiliar and ambiguous product problem in real time.',
    guidance:
      'We are evaluating their design process, decision-making, and collaboration, not the polish of the final screens.',
    criteria: [
      {
        key: 'problem_framing',
        label: 'Problem framing',
        help: 'Do they understand and narrow down the problem before jumping into solutions?',
      },
      {
        key: 'context_gathering',
        label: 'Context gathering',
        help: 'Do they ask useful questions about the goal, success metrics, platform, scope, constraints, and business requirements?',
      },
      {
        key: 'user_understanding',
        label: 'User understanding',
        help: 'Do they identify the right users and focus on behaviours, needs, and use cases relevant to the problem instead of making generic assumptions?',
      },
      {
        key: 'handling_ambiguity',
        label: 'Ability to handle ambiguity',
        help: 'Can they make reasonable assumptions, communicate them clearly, and continue making progress when complete information is unavailable?',
      },
      {
        key: 'prioritization',
        label: 'Prioritization',
        help: 'Can they reduce a broad problem into a focused and achievable scope within the available time?',
      },
      {
        key: 'user_flow_thinking',
        label: 'User flow thinking',
        help: 'Can they define a logical end-to-end flow before designing individual screens?',
      },
      {
        key: 'solution_reasoning',
        label: 'Solution reasoning',
        help: 'Can they connect their design decisions back to the user needs, product goals, and constraints identified earlier?',
      },
      {
        key: 'tradeoffs',
        label: 'Tradeoffs and decision-making',
        help: 'Can they compare options, make decisions confidently, and explain what they are prioritizing or sacrificing?',
      },
      {
        key: 'communication_collaboration',
        label: 'Communication and collaboration',
        help: 'Do they explain their thinking clearly, involve the interviewers in the process, ask for feedback, and respond well when new information is introduced?',
      },
      {
        key: 'reflection_next_steps',
        label: 'Reflection and next steps',
        help: 'Can they summarize their solution, identify weaknesses, explain what they would improve with more time, and describe how they would validate the solution?',
      },
    ],
    signals: [
      'Manages their time without getting stuck on one part of the problem.',
      'Prioritizes clarity over polished UI.',
      'Remains flexible when assumptions or constraints change.',
      'Focuses on key screens rather than trying to design the entire product.',
      'Keeps referring back to the original user and business goals.',
    ],
    notEvaluated: [
      'Pixel-perfect UI',
      'Visual polish',
      'Figma speed',
      'Completing every screen',
      'Finding one "correct" solution',
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
