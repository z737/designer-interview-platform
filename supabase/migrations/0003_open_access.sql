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
