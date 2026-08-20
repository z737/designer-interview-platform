-- Candidates are identified by full name + email; the separate username is gone.
--
-- `full_name` becomes NOT NULL. Any existing row without one is backfilled from
-- its username (or, failing that, the local part of the email) so the constraint
-- can be applied without losing anybody.

-- 1. Backfill before tightening.
update public.candidates
   set full_name = coalesce(nullif(trim(full_name), ''), nullif(trim(username), ''), split_part(email, '@', 1))
 where full_name is null or trim(full_name) = '';

-- 2. Name is now required and must be meaningful, not whitespace.
alter table public.candidates alter column full_name set not null;
alter table public.candidates drop constraint if exists candidates_full_name_not_blank;
alter table public.candidates
  add constraint candidates_full_name_not_blank check (length(trim(full_name)) > 0);

-- 3. Drop username and its unique index. Email is the sole identity key.
drop index if exists public.candidates_username_key;
alter table public.candidates drop column if exists username;
