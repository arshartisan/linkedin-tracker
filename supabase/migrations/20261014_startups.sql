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

