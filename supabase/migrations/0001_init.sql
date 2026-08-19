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
