-- Team SOPs: shared rich-text documents any member can edit.
begin;

create table if not exists public.sops (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner text not null references public.users(id),
  updated_by text not null references public.users(id),
  title text not null,
  category text not null default 'general',
  -- HTML produced by the app's editor schema.
  content text not null default '',
  constraint sops_title_not_empty check (btrim(title) <> ''),
  constraint sops_title_length check (char_length(title) <= 160),
  constraint sops_content_length check (char_length(content) <= 500000),
  constraint sops_category_valid check (
    category in ('general','linkedin','upwork','startups','onboarding')
  )
);

create index if not exists sops_updated_at_idx on public.sops (updated_at desc);

-- The server clock stamps every edit; saves compare against it to detect conflicts.
create or replace function public.touch_sop_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.created_at := old.created_at;
  new.owner := old.owner;
  return new;
end;
$$;

drop trigger if exists sops_touch_updated_at on public.sops;
create trigger sops_touch_updated_at
  before update on public.sops
  for each row execute function public.touch_sop_updated_at();

alter table public.sops enable row level security;
drop policy if exists "anon full access" on public.sops;
create policy "anon full access" on public.sops
  for all to anon using (true) with check (true);
grant select, insert, update, delete on public.sops to anon;

commit;
