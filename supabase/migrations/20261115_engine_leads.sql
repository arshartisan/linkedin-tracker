-- Upwork Engine, second round: lead candidates found during research, a
-- fingerprint that links several jobs from one client, and feedback on results.
-- Safe to run more than once.
begin;

-- Every person or company the research came across that could be the client
-- or lead to them. Kept even when no email was found, so the lead can be
-- reached another way (LinkedIn, contact form, X, phone).
create table if not exists public.engine_leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  job_key       text not null references public.engine_jobs(job_key) on delete cascade,
  -- Stable id for the lead within its job (LinkedIn URL, email or name), so
  -- re-running the research updates a lead instead of duplicating it.
  lead_key      text not null,
  kind          text not null default 'person' check (kind in ('person','company')),
  name          text not null,
  role          text not null default '',
  company       text not null default '',
  location      text not null default '',
  -- How the lead relates to the job's client.
  relation      text not null default 'mentioned'
                  check (relation in ('client','colleague','company','related','mentioned')),
  confidence    text not null default 'low' check (confidence in ('high','medium','low')),
  why           text not null default '',
  found_via     text not null default '',
  source_url    text not null default '',
  -- {email, linkedin, x, website, contact_form, phone, other: [{label, url}]}
  channels      jsonb not null default '{}'::jsonb,
  approach      text not null default '',
  status        text not null default 'new'
                  check (status in ('new','checked','contacted','replied','dismissed')),
  note          text not null default '',
  -- A person asks the worker for a message for one channel; the worker writes
  -- it into `draft` ({channel, subject, body, at}) and clears the request.
  draft_requested text check (draft_requested in ('email','linkedin','contact_form','x')),
  draft         jsonb,
  draft_error   text not null default '',
  contacted_at  timestamptz,
  contacted_by  text references public.users(id),
  contacted_via text not null default '',
  unique (job_key, lead_key)
);

create index if not exists engine_leads_job_idx on public.engine_leads (job_key);
create index if not exists engine_leads_status_idx on public.engine_leads (status, created_at desc);
create index if not exists engine_leads_requested_idx on public.engine_leads (draft_requested) where draft_requested is not null;

drop trigger if exists engine_leads_touch on public.engine_leads;
create trigger engine_leads_touch
  before update on public.engine_leads
  for each row execute function public.touch_engine_job();

-- Several postings from one client share this fingerprint (location, member
-- since and so on), so Reach can show them together and avoid emailing twice.
alter table public.engine_jobs add column if not exists client_key text;
create index if not exists engine_jobs_client_key_idx on public.engine_jobs (client_key) where client_key is not null;

-- A person's verdict on the result: {verdict, note, by, at}.
alter table public.engine_jobs add column if not exists feedback jsonb;

alter table public.engine_leads enable row level security;
drop policy if exists "anon full access" on public.engine_leads;
create policy "anon full access" on public.engine_leads for all to anon using (true) with check (true);
grant select, insert, update, delete on public.engine_leads to anon;

commit;
