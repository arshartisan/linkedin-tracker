-- Upwork Engine: an automated pipeline that runs on a Windows machine
-- (scraping + Claude) and reports every step here. Kept apart from the
-- manual connects/companies/contacts tables while it is being tested.
begin;

-- One row per Upwork job the engine collected. Each pipeline step writes its
-- own JSON column; `stage` is the last step that finished.
create table if not exists public.engine_jobs (
  id             uuid primary key default gen_random_uuid(),
  -- The job id from the URL (the part after "~"), so every URL form of the
  -- same job maps to one row.
  job_key        text not null unique,
  upwork_url     text not null,
  title          text not null default '',
  feed           text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  stage          text not null default 'collected'
                   check (stage in ('collected','analysed','enriched','verified','drafted','sent')),
  -- What the worker is doing right now, and what a person asked it to (re)run.
  running_step   text check (running_step in ('analyse','enrich','verify','draft','send')),
  requested_step text check (requested_step in ('analyse','enrich','verify','draft','send')),
  requested_by   text references public.users(id),
  error          text not null default '',
  -- Set when the worker stops for a person, e.g. "company not identified".
  hold_reason    text not null default '',
  skipped        boolean not null default false,
  -- Set when the job is already in the manual pipeline, naming who has it.
  duplicate_note text not null default '',
  captured       jsonb,
  intel          jsonb,
  enrich         jsonb,
  verify         jsonb,
  draft          jsonb,
  sent           jsonb,
  sent_by        text references public.users(id)
);

create index if not exists engine_jobs_created_at_idx on public.engine_jobs (created_at desc);
create index if not exists engine_jobs_requested_idx on public.engine_jobs (requested_step) where requested_step is not null;

create or replace function public.touch_engine_job()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists engine_jobs_touch on public.engine_jobs;
create trigger engine_jobs_touch
  before update on public.engine_jobs
  for each row execute function public.touch_engine_job();

-- Everything the engine does, in order: jobs found, pages opened, each web
-- search Claude ran, conclusions, drafts, sends, errors and alerts.
create table if not exists public.engine_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  worker_id  text not null default '',
  job_key    text,
  step       text not null default '',
  level      text not null default 'info' check (level in ('info','warn','error','alert')),
  message    text not null,
  data       jsonb
);

create index if not exists engine_events_created_at_idx on public.engine_events (created_at desc);
create index if not exists engine_events_job_idx on public.engine_events (job_key, created_at);

-- The Windows machine(s). `last_seen` is the heartbeat Reach uses to show
-- "online" / "offline since".
create table if not exists public.engine_workers (
  id           text primary key,
  started_at   timestamptz,
  last_seen    timestamptz,
  status       text not null default 'idle',
  detail       text not null default '',
  capabilities jsonb not null default '{}'::jsonb
);

-- Requests from Reach to the worker that aren't about one job: collect now,
-- pause, resume.
create table if not exists public.engine_commands (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  text references public.users(id),
  command     text not null check (command in ('collect','pause','resume')),
  args        jsonb not null default '{}'::jsonb,
  status      text not null default 'pending' check (status in ('pending','running','done','failed')),
  result      text not null default '',
  finished_at timestamptz
);

create index if not exists engine_commands_pending_idx on public.engine_commands (created_at) where status = 'pending';

-- Same access model as the rest of Reach: the app gate is the login cookie,
-- the database trusts the publishable key.
alter table public.engine_jobs enable row level security;
alter table public.engine_events enable row level security;
alter table public.engine_workers enable row level security;
alter table public.engine_commands enable row level security;

drop policy if exists "anon full access" on public.engine_jobs;
create policy "anon full access" on public.engine_jobs for all to anon using (true) with check (true);
drop policy if exists "anon full access" on public.engine_events;
create policy "anon full access" on public.engine_events for all to anon using (true) with check (true);
drop policy if exists "anon full access" on public.engine_workers;
create policy "anon full access" on public.engine_workers for all to anon using (true) with check (true);
drop policy if exists "anon full access" on public.engine_commands;
create policy "anon full access" on public.engine_commands for all to anon using (true) with check (true);

grant select, insert, update, delete on public.engine_jobs, public.engine_workers, public.engine_commands to anon;
grant select, insert, delete on public.engine_events to anon;
grant usage, select on sequence public.engine_events_id_seq to anon;

commit;
