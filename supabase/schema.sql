-- Reach — schema for the LinkedIn outreach pipeline.
-- Paste this into the Supabase SQL editor and run it. It is safe to re-run:
-- every statement is guarded, and the migration block at the bottom upgrades
-- a table created by the earlier status-only version of this file.

create table if not exists public.connects (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  sent_on       date not null default current_date,
  profile_url   text not null,
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

-- The access patterns are "today's rows", "newest first", and "what's actionable".
create index if not exists connects_sent_on_idx on public.connects (sent_on desc);
create index if not exists connects_created_at_idx on public.connects (created_at desc);
-- Partial index: the queue only ever reads the stages that still need work.
create index if not exists connects_open_stage_idx
  on public.connects (stage, last_touch_on)
  where stage in ('accepted', 'messaged', 'replied');

alter table public.connects enable row level security;

-- This app has no sign-in, so the anon key is the only credential. These
-- policies give anyone holding that key full access to the table. That is a
-- deliberate trade for a single-user tracker on a private URL — if you ever
-- share the deployment, add Supabase Auth and scope these policies to
-- auth.uid() instead.
drop policy if exists "anon full access" on public.connects;
create policy "anon full access"
  on public.connects
  for all
  to anon
  using (true)
  with check (true);
