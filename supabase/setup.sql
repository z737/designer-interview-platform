-- GENERATED — do not edit. Concatenation of supabase/migrations/*.sql in order.
-- Regenerate: cat supabase/migrations/*.sql > supabase/setup.sql
-- Paste the WHOLE file into the Supabase SQL editor and Run.

-- Product Designer interview platform — initial schema.
--
-- Data classification: candidate name, username, email and interview notes are
-- personal data under India's DPDP Act. Every table below is RLS-protected and
-- readable only by authenticated interviewers on an allow-listed email domain.
-- There is no anonymous read path.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------

-- Single source of truth for "who is allowed to touch interview data".
-- Change the domain list here if you ever hire an external panellist; keep it
-- in sync with VITE_ALLOWED_EMAIL_DOMAINS (that var is only a UI hint).
create or replace function public.is_interviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    split_part(lower(coalesce(auth.jwt() ->> 'email', '')), '@', 2) = any (array['gnani.ai']),
    false
  );
$$;

comment on function public.is_interviewer() is
  'True when the caller''s JWT email is on an allow-listed company domain. Used by every RLS policy.';

-- ---------------------------------------------------------------------------
-- Candidates
-- ---------------------------------------------------------------------------

create table if not exists public.candidates (
  id             uuid primary key default gen_random_uuid(),
  username       text not null,
  email          text not null,
  full_name      text,
  role_title     text not null default 'Product Designer',
  source         text,                        -- referral, LinkedIn, careers page…
  portfolio_url  text,
  current_round  smallint not null default 1 check (current_round between 1 and 9),
  status         text not null default 'in_progress'
                 check (status in ('in_progress', 'passed', 'rejected', 'on_hold', 'withdrawn')),
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Usernames and emails are the identity keys the team types in, so keep them
-- unique case-insensitively — "Anita_R" and "anita_r" are the same person.
create unique index if not exists candidates_username_key on public.candidates (lower(username));
create unique index if not exists candidates_email_key    on public.candidates (lower(email));

-- ---------------------------------------------------------------------------
-- Question bank — the questions available to ask in each round
-- ---------------------------------------------------------------------------

create table if not exists public.question_bank (
  id          uuid primary key default gen_random_uuid(),
  round_key   text not null,                 -- matches src/config/rounds.ts
  criterion   text,                          -- optional link to an evaluation criterion
  prompt      text not null,
  sort_order  smallint not null default 100,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists question_bank_round_idx on public.question_bank (round_key, sort_order);

-- ---------------------------------------------------------------------------
-- Evaluations — one row per (candidate, round, interviewer) submission
-- ---------------------------------------------------------------------------

create table if not exists public.evaluations (
  id                uuid primary key default gen_random_uuid(),
  candidate_id      uuid not null references public.candidates (id) on delete cascade,
  round_key         text not null,
  round_number      smallint not null,
  overall_score     smallint not null check (overall_score between 1 and 5),
  criteria_scores   jsonb not null default '{}'::jsonb,   -- { criterion_key: 1..5 }
  questions_asked   jsonb not null default '[]'::jsonb,   -- [{ prompt, source, response_notes }]
  notes             text not null default '',
  recommendation    text not null
                    check (recommendation in ('advance', 'hold', 'reject')),
  interviewer_id    uuid not null references auth.users (id) on delete cascade,
  interviewer_email text not null,
  submitted_at      timestamptz not null default now()
);

-- One submission per interviewer per round. Re-submitting updates in place
-- (see the upsert in src/lib/api.ts) rather than silently duplicating scores.
create unique index if not exists evaluations_unique_submission
  on public.evaluations (candidate_id, round_key, interviewer_id);

create index if not exists evaluations_candidate_idx on public.evaluations (candidate_id, round_number);

-- ---------------------------------------------------------------------------
-- Keep candidates.updated_at honest
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists candidates_touch_updated_at on public.candidates;
create trigger candidates_touch_updated_at
  before update on public.candidates
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.candidates    enable row level security;
alter table public.question_bank enable row level security;
alter table public.evaluations   enable row level security;

-- Candidates: any interviewer can read and add; nobody can hard-delete from the
-- client (use status = 'withdrawn' instead, so the audit trail survives).
drop policy if exists candidates_select on public.candidates;
create policy candidates_select on public.candidates
  for select to authenticated using (public.is_interviewer());

drop policy if exists candidates_insert on public.candidates;
create policy candidates_insert on public.candidates
  for insert to authenticated with check (public.is_interviewer() and created_by = auth.uid());

drop policy if exists candidates_update on public.candidates;
create policy candidates_update on public.candidates
  for update to authenticated
  using (public.is_interviewer()) with check (public.is_interviewer());

-- Question bank: readable by all interviewers, editable by all interviewers.
drop policy if exists question_bank_select on public.question_bank;
create policy question_bank_select on public.question_bank
  for select to authenticated using (public.is_interviewer());

drop policy if exists question_bank_write on public.question_bank;
create policy question_bank_write on public.question_bank
  for all to authenticated
  using (public.is_interviewer()) with check (public.is_interviewer());

-- Evaluations: everyone on the panel can read all scores (needed for the export
-- and for calibration), but you may only write a row that is yours.
drop policy if exists evaluations_select on public.evaluations;
create policy evaluations_select on public.evaluations
  for select to authenticated using (public.is_interviewer());

drop policy if exists evaluations_insert on public.evaluations;
create policy evaluations_insert on public.evaluations
  for insert to authenticated
  with check (public.is_interviewer() and interviewer_id = auth.uid());

drop policy if exists evaluations_update on public.evaluations;
create policy evaluations_update on public.evaluations
  for update to authenticated
  using (public.is_interviewer() and interviewer_id = auth.uid())
  with check (public.is_interviewer() and interviewer_id = auth.uid());

drop policy if exists evaluations_delete on public.evaluations;
create policy evaluations_delete on public.evaluations
  for delete to authenticated
  using (public.is_interviewer() and interviewer_id = auth.uid());
-- Seed question bank, derived from "Product Designer Interview Process and
-- Evaluation Guide". One or more prompts per evaluation criterion so an
-- interviewer can pick the angle that fits the candidate's work.
--
-- Safe to re-run: prompts are matched on (round_key, prompt).

create unique index if not exists question_bank_round_prompt_key
  on public.question_bank (round_key, prompt);

insert into public.question_bank (round_key, criterion, prompt, sort_order) values

-- Round 1 — Portfolio / Case-Study Review -----------------------------------
('portfolio', 'problem_understanding', 'Walk me through this project. What problem were you solving, and why did it matter to the business?', 10),
('portfolio', 'problem_understanding', 'How did you know this was the right problem to work on rather than something else on the roadmap?', 11),
('portfolio', 'ownership',             'Which parts of this did you personally own, and which were driven by the PM, engineers, or other designers?', 20),
('portfolio', 'ownership',             'What decision in this project would not have happened without you?', 21),
('portfolio', 'user_understanding',    'Who were the users? Describe their goals, context, and biggest pain points.', 30),
('portfolio', 'user_understanding',    'What did you get wrong about your users at the start that you only learned later?', 31),
('portfolio', 'product_thinking',      'How did this design change a user or business metric? What did you measure?', 40),
('portfolio', 'product_thinking',      'What did you deliberately choose not to build, and why?', 41),
('portfolio', 'ux_thinking',           'Take me through the full flow, including the empty, loading, error, and permission states.', 50),
('portfolio', 'ux_thinking',           'Where was the hardest complexity in this experience, and how did you simplify it?', 51),
('portfolio', 'visual_craft',          'Talk me through your typography, spacing, and hierarchy decisions on this screen.', 60),
('portfolio', 'visual_craft',          'How did this work fit into (or extend) a design system?', 61),
('portfolio', 'research_validation',   'What evidence informed this direction, and how did testing change the solution?', 70),
('portfolio', 'research_validation',   'Describe a time user feedback invalidated a design you were attached to. What did you do?', 71),
('portfolio', 'collaboration',         'How did you work with your PM and engineers through this? Where did you disagree?', 80),
('portfolio', 'collaboration',         'How did you handle a stakeholder who wanted something you thought was wrong?', 81),
('portfolio', 'ai_workflows',          'Where does AI sit in your design process today — research, exploration, prototyping, audits?', 90),
('portfolio', 'ai_workflows',          'Show me something you shipped faster or better because of an AI tool. What did it not help with?', 91),
('portfolio', 'self_awareness',        'Looking at this work today, what is the weakest part and what would you change?', 100),
('portfolio', 'self_awareness',        'What is a skill you know you need to grow, and what are you doing about it?', 101),

-- Round 2 — Online Whiteboarding --------------------------------------------
('whiteboard', 'problem_framing',      'Before we start: how would you restate this problem in your own words?', 10),
('whiteboard', 'problem_framing',      'What outcome would tell us this was worth building?', 11),
('whiteboard', 'clarifying_questions', 'What do you need to know from me about the users, goals, and constraints?', 20),
('whiteboard', 'clarifying_questions', 'What business objective do you think sits behind this request?', 21),
('whiteboard', 'assumptions',          'What are you assuming right now that we have not confirmed?', 30),
('whiteboard', 'assumptions',          'Which of those assumptions would hurt the most if it turned out to be wrong?', 31),
('whiteboard', 'prioritization',       'If you could only solve one part of this, which part and why?', 40),
('whiteboard', 'prioritization',       'What is explicitly out of scope for a first version?', 41),
('whiteboard', 'user_journey',         'Walk me through the end-to-end journey, not just this screen. Where does it start and end?', 50),
('whiteboard', 'user_journey',         'What happens to this user the second and tenth time they do this?', 51),
('whiteboard', 'information_architecture', 'How would you organise this information? What is primary, secondary, and hidden?', 60),
('whiteboard', 'information_architecture', 'What happens to this layout when the data volume grows 10x?', 61),
('whiteboard', 'tradeoffs',            'You considered another approach — why did you choose this one over it?', 70),
('whiteboard', 'tradeoffs',            'What does this design cost us in engineering effort, and is it worth it?', 71),
('whiteboard', 'edge_cases',           'What does this look like when it is empty, when it fails, and when it is slow?', 80),
('whiteboard', 'edge_cases',           'Which user type breaks this design — a brand-new user, a power user, or an admin?', 81),
('whiteboard', 'collaboration',        'What would you want the PM to go find out before you designed the next version?', 90),
('whiteboard', 'collaboration',        'How would you pressure-test this with engineering before committing?', 91),
('whiteboard', 'communication',        'Summarise your recommendation in two sentences, as if to a room of stakeholders.', 100),
('whiteboard', 'communication',        'What is the single riskiest part of what you just proposed?', 101)

on conflict (round_key, prompt) do nothing;
-- Remove authentication: the app opens straight to the candidate list.
--
-- ⚠️ SECURITY POSTURE CHANGE. After this migration anyone holding the anon key
-- — which ships in the browser bundle and is therefore public — can read and
-- write every candidate record, including names, emails and interview notes.
-- Only run this if the app stays on localhost or behind a VPN / IP allow-list.
-- To revert, re-run 0001_init.sql's policy section and restore the auth columns.

-- ---------------------------------------------------------------------------
-- 1. Drop the auth-dependent policies and the domain gate
-- ---------------------------------------------------------------------------

drop policy if exists candidates_select    on public.candidates;
drop policy if exists candidates_insert    on public.candidates;
drop policy if exists candidates_update    on public.candidates;
drop policy if exists question_bank_select on public.question_bank;
drop policy if exists question_bank_write  on public.question_bank;
drop policy if exists evaluations_select   on public.evaluations;
drop policy if exists evaluations_insert   on public.evaluations;
drop policy if exists evaluations_update   on public.evaluations;
drop policy if exists evaluations_delete   on public.evaluations;

drop function if exists public.is_interviewer();

-- ---------------------------------------------------------------------------
-- 2. Replace auth identity with a self-declared interviewer name
-- ---------------------------------------------------------------------------

-- Candidates: who added them is now a plain name, not an auth.users row.
alter table public.candidates drop column if exists created_by;
alter table public.candidates add  column if not exists created_by_name text;

-- Evaluations: attribution moves from auth.users to a typed-in name so the
-- export still shows who scored what.
alter table public.evaluations drop constraint if exists evaluations_interviewer_id_fkey;
drop index if exists public.evaluations_unique_submission;

alter table public.evaluations add column if not exists interviewer_name text;

-- Preserve attribution on any scorecards recorded before this migration.
update public.evaluations
   set interviewer_name = coalesce(interviewer_name, interviewer_email, 'Unknown')
 where interviewer_name is null;

alter table public.evaluations alter column interviewer_name set not null;
alter table public.evaluations drop column if exists interviewer_id;
alter table public.evaluations drop column if exists interviewer_email;

-- One scorecard per interviewer per round, matched case-insensitively so
-- "Abhijit" and "abhijit" update the same row instead of duplicating.
create unique index evaluations_unique_submission
  on public.evaluations (candidate_id, round_key, lower(interviewer_name));

-- ---------------------------------------------------------------------------
-- 3. Open policies
-- ---------------------------------------------------------------------------
-- RLS stays enabled with permissive policies rather than being switched off —
-- PostgREST needs a policy to match, and this keeps the grant surface explicit
-- and easy to tighten later.

create policy candidates_open on public.candidates
  for all to anon, authenticated using (true) with check (true);

create policy question_bank_open on public.question_bank
  for all to anon, authenticated using (true) with check (true);

create policy evaluations_open on public.evaluations
  for all to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant all on public.candidates    to anon, authenticated;
grant all on public.question_bank to anon, authenticated;
grant all on public.evaluations   to anon, authenticated;
