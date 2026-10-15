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
  website_url       text not null default '',
  linkedin_url      text not null default '',
  outreach_channels text[] not null default '{}',
  owner             text not null default 'arsh' references public.users(id),
  note              text not null default ''
);

alter table public.companies
  add column if not exists website_url text not null default '';

-- Company identity keys mirror src/lib/company.ts. Website identity is the
-- domain, so /contact and /about still refer to the same company.
create or replace function public.company_website_key(value text)
returns text language sql immutable strict as $$
  select nullif(regexp_replace(
    split_part(split_part(split_part(
      regexp_replace(regexp_replace(lower(trim(value)), '^https?://', ''), '^www\.', ''),
      '/', 1), '?', 1), '#', 1), ':443$|:80$', ''), '');
$$;

create or replace function public.company_linkedin_key(value text)
returns text language sql immutable strict as $$
  select nullif(regexp_replace(regexp_replace(
    split_part(split_part(
      regexp_replace(regexp_replace(lower(trim(value)), '^https?://', ''), '^www\.', ''),
      '?', 1), '#', 1), '/+$', ''),
    '^(linkedin\.com/company/[^/]+)/.*$', '\1'), '');
$$;

-- Resolve existing duplicates before creating these indexes (MIGRATION.md).
-- Global uniqueness protects concurrent inserts and edits across the team.
create unique index if not exists companies_website_key
  on public.companies (public.company_website_key(website_url));
create unique index if not exists companies_linkedin_key
  on public.companies (public.company_linkedin_key(linkedin_url));
create unique index if not exists companies_name_without_url_key
  on public.companies (regexp_replace(lower(trim(company_name)), '\s+', ' ', 'g'))
  where public.company_website_key(website_url) is null
    and public.company_linkedin_key(linkedin_url) is null;

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
alter table public.connects add column if not exists client_type text not null default 'unclassified';
alter table public.connects drop constraint if exists connects_client_type_check;
alter table public.connects add constraint connects_client_type_check
  check (client_type in ('unclassified', 'enterprise', 'potential', 'enterprise_potential'));
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

-- Startup identity is shared across every team member.
begin;

create or replace function public.startup_name_key(value text)
returns text language sql immutable strict
as $$
  select regexp_replace(regexp_replace(lower(value), '^\s+|\s+$', '', 'g'), '\s+', ' ', 'g');
$$;

create or replace function public.startup_linkedin_key(value text)
returns text language sql immutable strict
as $$
  select substring(lower(trim(value)) from
    '^(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com(?::(?:443|80))?/((?:in|pub|company)/[^/?#]+)');
$$;

create table if not exists public.startups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner text not null references public.users(id),
  name text not null,
  name_key text generated always as (public.startup_name_key(name)) stored,
  website_url text not null default '',
  yc_url text not null default '',
  founder_linkedin_urls text[] not null default '{}',
  linkedin_url text not null default '',
  facebook_url text not null default '',
  x_url text not null default '',
  instagram_url text not null default '',
  other_social_urls text[] not null default '{}',
  email text not null default '',
  outreach_channels text[] not null default '{}',
  note text not null default '',
  constraint startups_name_not_empty check (name_key <> ''),
  constraint startups_channels_valid check (
    outreach_channels <@ array['email','linkedin','instagram','messenger','facebook','x','whatsapp','other']::text[]
  ),
  constraint startups_name_key_unique unique (name_key)
);

create index if not exists startups_owner_created_at_idx on public.startups (owner, created_at desc);

-- One unique claim per profile; an array alone cannot prevent overlapping founders.
create table if not exists public.startup_linkedin_profiles (
  profile_key text primary key,
  startup_id uuid not null references public.startups(id) on delete cascade
);
create index if not exists startup_linkedin_profiles_startup_idx
  on public.startup_linkedin_profiles (startup_id);

create or replace function public.sync_startup_linkedin_profiles()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  profile_url text;
  profile_key text;
begin
  delete from public.startup_linkedin_profiles where startup_id = new.id;
  foreach profile_url in array new.founder_linkedin_urls loop
    profile_key := public.startup_linkedin_key(profile_url);
    if profile_key is null or profile_key !~ '^(in|pub)/' then
      raise exception 'Enter a valid LinkedIn profile link for each founder.' using errcode = '23514';
    end if;
    insert into public.startup_linkedin_profiles (profile_key, startup_id)
      values (profile_key, new.id);
  end loop;
  if new.linkedin_url <> '' then
    profile_key := public.startup_linkedin_key(new.linkedin_url);
    if profile_key is null then
      raise exception 'Enter a valid LinkedIn profile or company link.' using errcode = '23514';
    end if;
    insert into public.startup_linkedin_profiles (profile_key, startup_id)
      values (profile_key, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists startups_sync_linkedin on public.startups;
create trigger startups_sync_linkedin
  after insert or update of founder_linkedin_urls, linkedin_url on public.startups
  for each row execute function public.sync_startup_linkedin_profiles();

-- Also rebuild claims when re-running against an existing startups table.
-- Any overlap aborts the transaction, preserving the previous data and claims.
delete from public.startup_linkedin_profiles;
insert into public.startup_linkedin_profiles (profile_key, startup_id)
select public.startup_linkedin_key(profile_url), startups.id
from public.startups as startups
cross join lateral unnest(
  startups.founder_linkedin_urls ||
  case when startups.linkedin_url = '' then '{}'::text[] else array[startups.linkedin_url] end
) as profiles(profile_url);

alter table public.startups enable row level security;
drop policy if exists "anon full access" on public.startups;
create policy "anon full access" on public.startups
  for all to anon using (true) with check (true);
grant select, insert, update, delete on public.startups to anon;

-- Claims can only be changed by the trigger, keeping direct API writes guarded.
alter table public.startup_linkedin_profiles enable row level security;
revoke all on public.startup_linkedin_profiles from anon, authenticated;
revoke all on function public.sync_startup_linkedin_profiles() from public;

commit;
