-- Reach — schema for the LinkedIn connect log.
-- Paste this into the Supabase SQL editor and run it once.

create table if not exists public.connects (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  sent_on     date not null default current_date,
  profile_url text not null,
  name        text not null default '',
  status      text not null default 'pending'
                check (status in ('pending', 'accepted', 'ignored')),
  note        text not null default '',
  tags        text[] not null default '{}'
);

-- The two access patterns are "today's rows" and "newest first".
create index if not exists connects_sent_on_idx on public.connects (sent_on desc);
create index if not exists connects_created_at_idx on public.connects (created_at desc);

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
