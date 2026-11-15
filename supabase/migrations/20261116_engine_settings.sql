-- Upwork Engine: text the worker reads when it writes messages, edited in
-- Reach (Engine → Profile) instead of in files on the Windows machine.
-- Keys: 'my_profile' (who you are, services, case studies, tone).
-- Safe to run more than once.
begin;

create table if not exists public.engine_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  text references public.users(id)
);

drop trigger if exists engine_settings_touch on public.engine_settings;
create trigger engine_settings_touch
  before update on public.engine_settings
  for each row execute function public.touch_engine_job();

alter table public.engine_settings enable row level security;
drop policy if exists "anon full access" on public.engine_settings;
create policy "anon full access" on public.engine_settings for all to anon using (true) with check (true);
grant select, insert, update on public.engine_settings to anon;

commit;
