import type { jsPDF } from 'jspdf'
import { SCORE_LABELS, roundByKey, type Round } from '../config/rounds'
import { averageScore, evaluationScore } from './score'
import type { BankQuestion, Candidate, Evaluation } from './types'

/**
 * Single-round evaluation report. Built with jsPDF's core fonts rather than an
 * embedded typeface — bundling a webfont would add ~300KB to the client for a
 * document nobody reads on screen.
 *
 * jsPDF is imported dynamically: it pulls in html2canvas and DOMPurify for
 * features we never touch, and that is ~430KB nobody should pay for on load.
 */

const PAGE = { w: 595.28, h: 841.89 } // A4 in points
const M = 56 // margin
const CONTENT_W = PAGE.w - M * 2

type Cursor = { doc: jsPDF; y: number }

export async function buildRoundReport(args: {
  candidate: Candidate
  round: Round
  evaluations: Evaluation[]
  questionBank: BankQuestion[]
  now: Date
}): Promise<{ blob: Blob; filename: string }> {
  const { candidate, round, evaluations, questionBank, now } = args
  const { jsPDF: JsPDF } = await import('jspdf')
  const doc = new JsPDF({ unit: 'pt', format: 'a4' })
  const c: Cursor = { doc, y: M }

  // --- Header ---------------------------------------------------------
  label(c, 'PRODUCT DESIGNER INTERVIEW')
  heading(c, candidate.full_name, 22)
  body(c, candidate.email, '#616161')
  if (candidate.portfolio_url) body(c, candidate.portfolio_url, '#1863dc')
  c.y += 8
  rule(c)

  // --- Round ----------------------------------------------------------
  label(c, `ROUND ${round.number}`)
  heading(c, round.title, 16)
  body(c, `Interviewers: ${round.interviewers}`, '#616161')
  c.y += 4
  body(c, round.objective)
  if (round.guidance) {
    c.y += 2
    body(c, round.guidance, '#616161', 'italic')
  }
  c.y += 8
  rule(c)

  if (evaluations.length === 0) {
    body(c, 'No scorecard has been submitted for this round.')
  }

  evaluations.forEach((evaluation, i) => {
    if (i > 0) {
      c.y += 8
      rule(c)
    }
    renderScorecard(c, round, evaluation)
  })

  // --- Suggested questions --------------------------------------------
  const bank = questionBank.filter((q) => q.round_key === round.key)
  if (bank.length > 0) {
    c.y += 8
    // Keep the heading with at least its first criterion group.
    ensureSpace(c, 110)
    rule(c)
    label(c, 'SUGGESTED QUESTIONS FOR THIS ROUND')
    c.y += 2
    for (const criterion of round.criteria) {
      const qs = bank.filter((q) => q.criterion === criterion.key)
      if (qs.length === 0) continue
      ensureSpace(c, 60)
      body(c, criterion.label, '#17171c', 'bold')
      for (const q of qs) bullet(c, q.prompt)
      c.y += 4
    }
  }

  // --- Footer on every page -------------------------------------------
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor('#93939f')
    doc.text(
      `Confidential — contains personal data. Generated ${now.toISOString().slice(0, 16).replace('T', ' ')}`,
      M,
      PAGE.h - 28,
    )
    doc.text(`${p} / ${pages}`, PAGE.w - M, PAGE.h - 28, { align: 'right' })
  }

  const filename = `${slug(candidate.full_name)}-round-${round.number}-${round.key}.pdf`
  return { blob: doc.output('blob'), filename }
}

function renderScorecard(c: Cursor, round: Round, e: Evaluation) {
  const mean = averageScore(e.criteria_scores)
  const shown = evaluationScore(e)

  ensureSpace(c, 120)
  label(c, `SCORECARD · ${e.interviewer_name.toUpperCase()}`)
  c.y += 2

  // Overall figure, stated as derived. Positions are measured rather than
  // guessed so "/ 5" and the verdict sit on the figure's baseline.
  const figure = shown.toFixed(1)
  const baseline = c.y + 22

  c.doc.setFont('helvetica', 'bold')
  c.doc.setFontSize(28)
  c.doc.setTextColor('#17171c')
  c.doc.text(figure, M, baseline)
  const figureW = c.doc.getTextWidth(figure)

  c.doc.setFont('helvetica', 'normal')
  c.doc.setFontSize(10)
  c.doc.setTextColor('#616161')
  c.doc.text('/ 5', M + figureW + 6, baseline)
  const ofW = c.doc.getTextWidth('/ 5')

  c.doc.setTextColor('#17171c')
  c.doc.text(SCORE_LABELS[Math.round(shown)] ?? '', M + figureW + ofW + 20, baseline)

  c.doc.setFontSize(9)
  c.doc.setTextColor('#616161')
  c.doc.text(
    mean === null
      ? 'Overall score'
      : `Calculated: mean of ${Object.keys(e.criteria_scores).length} criteria`,
    M,
    baseline + 14,
  )
  c.y = baseline + 30

  body(c, `Recommendation: ${e.recommendation}`, '#17171c', 'bold')
  body(c, `Submitted ${new Date(e.submitted_at).toLocaleString()}`, '#616161')
  c.y += 8

  // --- Criteria table -------------------------------------------------
  const scored = round.criteria.filter((cr) => e.criteria_scores?.[cr.key] != null)
  if (scored.length) {
    ensureSpace(c, 40)
    label(c, 'EVALUATION CRITERIA')
    c.y += 4
    for (const cr of scored) {
      const score = e.criteria_scores[cr.key]
      ensureSpace(c, 22)
      c.doc.setFont('helvetica', 'normal')
      c.doc.setFontSize(10)
      c.doc.setTextColor('#212121')
      c.doc.text(cr.label, M, c.y)
      c.doc.setFont('helvetica', 'bold')
      c.doc.text(`${score} / 5`, PAGE.w - M, c.y, { align: 'right' })
      c.y += 6
      c.doc.setDrawColor('#f2f2f2')
      c.doc.line(M, c.y, PAGE.w - M, c.y)
      c.y += 12
    }
  }

  // --- Notes ----------------------------------------------------------
  if (e.notes?.trim()) {
    c.y += 4
    ensureSpace(c, 60)
    label(c, 'NOTES & FEEDBACK')
    c.y += 4
    body(c, e.notes.trim())
  }
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function ensureSpace(c: Cursor, needed: number) {
  if (c.y + needed > PAGE.h - M) {
    c.doc.addPage()
    c.y = M
  }
}

function label(c: Cursor, text: string) {
  ensureSpace(c, 24)
  c.doc.setFont('courier', 'normal')
  c.doc.setFontSize(8)
  c.doc.setTextColor('#75758a')
  c.doc.text(text, M, c.y)
  c.y += 16
}

function heading(c: Cursor, text: string, size: number) {
  const lines = c.doc.splitTextToSize(text, CONTENT_W) as string[]
  ensureSpace(c, lines.length * (size + 4) + 8)
  c.doc.setFont('helvetica', 'normal')
  c.doc.setFontSize(size)
  c.doc.setTextColor('#17171c')
  for (const line of lines) {
    c.doc.text(line, M, c.y)
    c.y += size + 4
  }
  c.y += 4
}

function body(c: Cursor, text: string, color = '#212121', style: 'normal' | 'bold' | 'italic' = 'normal') {
  const lines = c.doc.splitTextToSize(text, CONTENT_W) as string[]
  c.doc.setFont('helvetica', style)
  c.doc.setFontSize(10)
  c.doc.setTextColor(color)
  for (const line of lines) {
    ensureSpace(c, 16)
    c.doc.text(line, M, c.y)
    c.y += 14
  }
}

function bullet(c: Cursor, text: string) {
  const lines = c.doc.splitTextToSize(text, CONTENT_W - 14) as string[]
  c.doc.setFont('helvetica', 'normal')
  c.doc.setFontSize(10)
  c.doc.setTextColor('#616161')
  lines.forEach((line, i) => {
    ensureSpace(c, 16)
    if (i === 0) c.doc.text('·', M, c.y)
    c.doc.text(line, M + 14, c.y)
    c.y += 14
  })
}

function rule(c: Cursor) {
  ensureSpace(c, 20)
  c.doc.setDrawColor('#d9d9dd')
  c.doc.line(M, c.y, PAGE.w - M, c.y)
  c.y += 20
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'candidate'
  )
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export { roundByKey }
