-- Reach — schema for the LinkedIn outreach pipeline.
-- Paste this into the Supabase SQL editor and run it. It is safe to re-run:
-- every statement is guarded, and the migration blocks upgrade a table created
-- by an earlier version of this file.

-- The three people working the pipeline. `id` is the slug the app uses in code
-- and stores on every connect. Phone numbers are deliberately NOT here: they
-- are the login credential and live server-side in src/lib/auth.ts, never in a
-- table the browser can read.
create table if not exists public.users (
  id         text primary key check (id in ('arsh','abdul','rishad')),
  name       text not null,
  daily_goal smallint not null default 30 check (daily_goal > 0)
);

insert into public.users (id, name) values
  ('arsh',   'Arsh'),
  ('abdul',  'Abdul'),
  ('rishad', 'Rishad')
on conflict (id) do nothing;

create table if not exists public.connects (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  sent_on       date not null default current_date,
  profile_url   text not null,
  upwork_url    text not null default '',
  project_title text not null default '',
  project_description text not null default '',
  client_reviews text not null default '',
  email         text not null default '',
  outreach_channels text[] not null default '{}',
  -- Who sent this invite. Every row predating multi-user is backfilled to
  -- 'arsh', which is also why that is the default - see the migration below.
  owner         text not null default 'arsh' references public.users(id),
  -- Derived from profile_url so one person can't be connected with twice, by
  -- anyone. Mirrors PROFILE_RE in src/lib/linkedin.ts.
  profile_slug  text generated always as (
                  substring(lower(profile_url) from 'linkedin\.com/(?:in|pub)/([^/?#]+)')
                ) stored,
  name          text not null default '',
  -- pending → accepted → messaged → replied → lead, or closed at any point.
  stage         text not null default 'pending'
                  check (stage in ('pending','accepted','messaged','replied','lead','closed')),
  note          text not null default '',
  tags          text[] not null default '{}',
  -- Milestone days, null until reached. These drive follow-up timing and the funnel.
  accepted_on   date,
  messaged_on   date,
  replied_on    date,
  lead_on       date,
  -- Day of the last message you sent; a follow-up becomes due 3 days after it.
  last_touch_on date,
  followups     smallint not null default 0 check (followups between 0 and 2)
);

-- Companies have their own lightweight outreach record rather than being
-- mixed into the person/job pipeline above.
create table if not exists public.companies (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  company_name      text not null,
  email             text not null default '',
  linkedin_url      text not null default '',
  outreach_channels text[] not null default '{}',
  owner             text not null default 'arsh' references public.users(id),
  note              text not null default ''
);

-- Migration from the original three-status table. No-ops on a fresh install.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'connects' and column_name = 'status'
  ) then
    alter table public.connects
      add column if not exists stage         text,
      add column if not exists accepted_on   date,
      add column if not exists messaged_on   date,
      add column if not exists replied_on    date,
      add column if not exists lead_on       date,
      add column if not exists last_touch_on date,
      add column if not exists followups     smallint not null default 0;

    -- 'ignored' becomes 'closed'; 'accepted' rows keep their day as a best guess.
    update public.connects
       set stage = case status when 'ignored' then 'closed' else status end
     where stage is null;

    update public.connects
       set accepted_on = sent_on
     where stage = 'accepted' and accepted_on is null;

    alter table public.connects
      alter column stage set default 'pending',
      alter column stage set not null;

    alter table public.connects drop constraint if exists connects_status_check;
    alter table public.connects drop column status;
  end if;
end $$;

alter table public.connects
  drop constraint if exists connects_stage_check;
alter table public.connects
  add constraint connects_stage_check
  check (stage in ('pending','accepted','messaged','replied','lead','closed'));

alter table public.connects add column if not exists upwork_url text not null default '';
alter table public.connects add column if not exists project_title text not null default '';
alter table public.connects add column if not exists project_description text not null default '';
alter table public.connects add column if not exists client_reviews text not null default '';
alter table public.connects add column if not exists email text not null default '';
alter table public.connects add column if not exists outreach_channels text[] not null default '{}';

-- Migration to multi-user. No-ops on a fresh install (the columns already exist).
--
-- Everything logged before this point was sent by Arsh, so `default 'arsh'` on
-- the ADD COLUMN is what performs the backfill.
--
-- The default stays. The app always sends `owner`, so it is never used in
-- practice - but it means the currently deployed single-user build keeps
-- working against the migrated table. Without it, every insert from the old
-- code would fail in the window between running this file and the new build
-- going live.
alter table public.connects add column if not exists owner text not null default 'arsh';
update public.connects set owner = 'arsh' where owner is null or owner = '';

alter table public.connects drop constraint if exists connects_owner_fkey;
alter table public.connects add constraint connects_owner_fkey
  foreign key (owner) references public.users(id);

alter table public.connects add column if not exists profile_slug text
  generated always as (
    substring(lower(profile_url) from 'linkedin\.com/(?:in|pub)/([^/?#]+)')
  ) stored;

-- The access patterns are "today's rows", "newest first", and "what's actionable".
create index if not exists connects_sent_on_idx on public.connects (sent_on desc);
create index if not exists connects_created_at_idx on public.connects (created_at desc);
-- Partial index: the queue only ever reads the stages that still need work.
create index if not exists connects_open_stage_idx
  on public.connects (stage, last_touch_on)
  where stage in ('accepted', 'messaged', 'replied');
-- Every personal screen reads "my rows, newest first".
create index if not exists connects_owner_sent_on_idx on public.connects (owner, sent_on desc);
create index if not exists companies_owner_created_at_idx
  on public.companies (owner, created_at desc);

-- The duplicate guard. Global, not per-owner: the whole point is that if Abdul
-- has already connected with someone, Rishad must not connect with them again.
-- The client blocks this in the form; this index is what makes it true when two
-- people submit the same profile at the same moment.
--
-- ⚠️ This will FAIL if the table already contains duplicates. Find and resolve
-- them first — see supabase/MIGRATION.md.
create unique index if not exists connects_profile_slug_key
  on public.connects (profile_slug)
  where profile_slug is not null;
create unique index if not exists connects_upwork_url_key
  on public.connects (lower(trim(upwork_url)))
  where upwork_url <> '';

alter table public.connects enable row level security;
alter table public.companies enable row level security;
alter table public.users enable row level security;

-- Sign-in is a phone-number gate in the Next.js layer (a signed cookie checked
-- by proxy.ts), not Supabase Auth — so as far as Postgres is concerned the
-- publishable key is still the only credential, and these policies give anyone
-- holding it full access. The gate stops someone loading the app; it does not
-- stop someone who pulls the key out of the JS bundle. `owner` is therefore a
-- record of who logged a connect, not an enforced boundary. Closing that gap
-- means moving reads and writes behind route handlers with a service-role key.
drop policy if exists "anon full access" on public.connects;
create policy "anon full access"
  on public.connects
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon full access" on public.companies;
create policy "anon full access"
  on public.companies
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon full access" on public.users;
create policy "anon full access"
  on public.users
  for all
  to anon
  using (true)
  with check (true);
