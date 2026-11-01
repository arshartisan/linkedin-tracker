-- Common leads shared across the team. The email address is the identity.
begin;

create table if not exists public.contacts (
  -- Stored trimmed and lowercase, so the primary key is case-insensitive.
  email text primary key,
  created_at timestamptz not null default now(),
  owner text not null references public.users(id),
  name text not null,
  phone text not null default '',
  country text not null default '',
  social_url text not null default '',
  constraint contacts_email_normalized check (email = lower(btrim(email))),
  constraint contacts_email_valid check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint contacts_name_not_empty check (btrim(name) <> ''),
  constraint contacts_phone_valid check (phone = '' or phone ~ '^\+?[0-9\s().-]+$'),
  constraint contacts_social_url_valid check (social_url = '' or social_url ~* '^https?://')
);

create index if not exists contacts_owner_created_at_idx on public.contacts (owner, created_at desc);

-- Who added a contact, and when, never changes on edit.
create or replace function public.keep_contact_origin()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.created_at := old.created_at;
  new.owner := old.owner;
  return new;
end;
$$;

drop trigger if exists contacts_keep_origin on public.contacts;
create trigger contacts_keep_origin
  before update on public.contacts
  for each row execute function public.keep_contact_origin();

alter table public.contacts enable row level security;
drop policy if exists "anon full access" on public.contacts;
create policy "anon full access" on public.contacts
  for all to anon using (true) with check (true);
grant select, insert, update, delete on public.contacts to anon;

commit;
