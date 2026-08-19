# Product Designer Interview Platform

Internal tool for running the Product Designer loop: add candidates, score each round
1–5 with notes, advance them through the pipeline, and export the whole record as a
git-ready repository.

Rounds are taken from *Product Designer Interview Process and Evaluation Guide*:

| # | Round | Interviewers |
| --- | --- | --- |
| 1 | Portfolio / Case-Study Review | Abhijit and Harshita |
| 2 | Online Whiteboarding | One PM + one designer (Abhijit, Harshita, Mayank, or Harshit) |

The guide's **Round 3: Final Discussion** is not enabled — see
[Adding round 3](#adding-round-3), it's a few lines.

---

## Setup

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com). Pick the region closest to
   the panel; if candidate data must stay in India, choose **ap-south-1 (Mumbai)**.
2. Open **SQL Editor** and run, in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_seed_question_bank.sql`
   - `supabase/migrations/0003_open_access.sql`

   Or, with the Supabase CLI:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF && supabase db push
   ```

There is no authentication step to configure — see [Access](#access) below.

### 2. Configure the app

```bash
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
**Project Settings → API**. Never put the `service_role` key in this project — it
bypasses RLS entirely.

### 3. Run it

```bash
npm install && npm run dev
```

Opens straight to the candidate list. No sign-in.

---

## Access

**This app has no authentication.** Requests go out as Supabase's `anon` role, and
`0003_open_access.sql` grants that role full read/write on all three tables. The anon key
is public by design — it ships inside the JavaScript bundle — so *anyone who can load the
page can read and write every candidate record*, including names, emails and interview
notes.

That is fine on `localhost` or behind a VPN. It is not safe on a public URL. If you later
need to expose this beyond your network, put it behind an authenticating proxy or restore
the auth model by re-running the policy section of `0001_init.sql`.

### Who scored what

Instead of accounts, each interviewer sets their name in the **You** field in the top
bar. It defaults to `Gnani`; overwrite it with your own name so scorecards are
attributable to a person. It is kept in that browser's `localStorage` and attached to every scorecard they
submit, so the export still shows who gave which score. Names are matched
case-insensitively, so re-submitting a round updates your existing scorecard rather than
creating a duplicate.

This is attribution, not authentication — anyone can type any name. It exists to make
panel calibration possible, not to prevent impersonation.

Other behaviour worth knowing:

- Everyone sees all candidates and all scorecards, which is what calibration needs.
- Deleting a candidate is permanent and cascades to their scorecards. There is no undo and
  no audit trail, so the UI confirms first.

---

## Scoring

Each criterion is scored 1-5. **The overall score is calculated, never typed in** — it is
the mean of every criterion in that round, which is why all of them must be scored before
you can submit. The database column `overall_score` is an integer (its CHECK constraint is
1-5), so it stores the rounded value; anywhere a precise figure appears the mean is
recomputed from `criteria_scores`.

Each round also lists **suggested questions**, collapsed by default. They are reference
prompts to draw on during the interview — nothing there is recorded. What gets captured is
the criterion scores, your notes, and the recommendation. The full question bank still
ships in the repository export and in every PDF report.

## Reports

Two kinds of export:

- **Download repository** (page header) — the whole pipeline as a git-ready zip. See
  [Exporting](#exporting).
- **Round report (PDF)** — one candidate, one round: derived score, every criterion,
  notes, recommendation, and the round's suggested questions. Available from the
  **Export report (PDF)** link inside a round once that round has a submitted scorecard,
  or from the `⋯` menu at the end of any candidate row.

The row menu also holds **Delete candidate**, which asks for confirmation and warns how
many scorecards go with it. Deletion cascades — export a report first if you need the
record.

## How the pipeline moves

Each submission carries a recommendation, and that is what moves the candidate:

| Recommendation | Effect |
| --- | --- |
| **Advance** | Moves to the next round. On the last round, status becomes `passed`. |
| **Hold** | Status becomes `on_hold`; the candidate stays on the same round. |
| **Do not proceed** | Status becomes `rejected`, from any round. |

Advancement only fires from the round the candidate is *currently* on. Editing an older
round's scorecard corrects the record without rewinding or double-advancing anyone, and
two interviewers both submitting "advance" on round 1 does not skip the candidate to
round 3.

---

## Exporting

**Download repository** produces `designer-interviews-YYYY-MM-DD.zip`:

```
README.md                    Scale legend, counts, confidentiality notice
.gitignore
rounds/
  round-1-portfolio.md       Objective, criteria, and the full question bank
  round-2-whiteboard.md
  rounds.json                Round + criteria definitions
  question-bank.json
candidates/<username>/
  README.md                  Candidate summary + scorecard table
  candidate.json             Raw record including every evaluation
  round-1-portfolio.md       Per-round: criteria scores, derived overall, notes
data/
  candidates.csv             One row per candidate, with current round
  evaluations.csv            One row per scorecard
  criteria-scores.csv        Long format — the shape you want for calibration pivots
  candidates.json / evaluations.json
```

Unzip and `git init && git add . && git commit -m "Interview export"` to make it a repo.

CSV cells beginning `=`, `+`, `-` or `@` are prefixed with `'` so a candidate-supplied
string cannot execute as a formula when someone opens the file in Excel or Sheets.

Verify the exporter without a database:

```bash
npm run verify:export
```

---

## Adding round 3

1. Append to `ROUNDS` in [src/config/rounds.ts](src/config/rounds.ts) — the guide's
   Round 3 criteria are ownership, judgment, accountability, feedback, ambiguity,
   business understanding, learning ability, AI and product curiosity, team fit, and
   growth potential.
2. Add a migration seeding `question_bank` rows with the same `round_key`.

The table, tabs, progress pips, export, and advancement logic all read from that array —
nothing else changes.

---

## Design preview

`preview.html` renders the real table and scoring drawer against fixture data, so you can
iterate on the UI without a Supabase connection:

```bash
npm run dev
```

then open <http://localhost:5173/preview.html>. It is a dev-only entry — `npm run build`
only bundles `index.html`.

---

## Data protection

Candidate names, emails, portfolio links and interview notes are **personal data** under
India's DPDP Act, collected for the stated purpose of assessing a job application.

- **There is no access control.** Anyone who can reach the app can read and write all of
  it. Keep it on localhost or behind your VPN.
- No candidate identifiers are placed in URLs or query strings.
- Exports are excluded from git by `.gitignore` (`exports/`, `*.zip`).
- Keep exports in a private repository or access-controlled drive, and delete them once
  the hiring decision is closed and your retention period lapses.
- Recruitment owns notice and consent for storing candidate data — this tool assumes that
  is already in place. Confirm retention and deletion policy with Legal before this
  becomes the system of record.

## Deploying

Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages):

```bash
npm run build     # → dist/
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time env vars on the host.

**Do not deploy this to a public URL as it stands.** With no sign-in, a public deployment
exposes every candidate's name, email and interview notes to anyone who finds the link.
The `noindex` meta tag is a hint to crawlers, not access control. Put it behind an SSO
proxy, an IP allow-list, or Cloudflare Access first — or restore the auth model.
