-- Reach — schema for the *local business* pipeline.
--
-- This is the second section of the app, parallel to (and independent of) the
-- LinkedIn pipeline in schema.sql. Run schema.sql FIRST: the tables below
-- reference public.users, which that file creates and seeds.
--
-- Paste this into the Supabase SQL editor and run it. Safe to re-run.
--
-- The work it models:
--   search "<category> in <city>" → log the businesses you find → open their
--   website and Facebook to dig out a WhatsApp number → message them on
--   WhatsApp → follow up twice → qualify the replies.


-- ---------------------------------------------------------------------------
-- Cities
-- ---------------------------------------------------------------------------
-- The `x` in "cleaning services in x". A table rather than a constant because
-- the target list grows: today Newport, Doha and Lusail, tomorrow whatever
-- else is worth sweeping.
--
-- `dial` is the country calling code without the +. It is what turns a local
-- number written on a shop's website ("05 512 3456") into the E.164 form
-- wa.me needs — see toE164() in src/lib/biz.ts.
create table if not exists public.biz_cities (
  id     text primary key,
  name   text not null,
  -- Disambiguates the search: "Newport" alone finds the wrong one in Wales.
  region text not null default '',
  dial   text not null default '',
  sort   smallint not null default 0,
  -- Retiring a city hides it from the sweep grid without orphaning the
  -- businesses already logged against it.
  active boolean not null default true
);

insert into public.biz_cities (id, name, region, dial, sort) values
  ('newport', 'Newport', 'Shropshire, UK', '44',  1),
  ('doha',    'Doha',    'Qatar',          '974', 2),
  ('lusail',  'Lusail',  'Qatar',          '974', 3)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
-- Only the trades someone has *added* from the picker. The sixteen the grid
-- ships with live in src/lib/biz.ts and are not stored — a code constant is the
-- right home for a list that ships with the app, and duplicating it here would
-- mean two places to edit.
--
-- A built-in that gets retired writes a row with the same id and active=false;
-- deleting that row is what puts it back on the grid.
create table if not exists public.biz_categories (
  id      text primary key,
  -- Also the search term: "tyre shops" becomes "tyre shops in {city}".
  label   text not null,
  -- Which block of the grid it sits in. Free text: the picker can invent one.
  "group" text not null default 'Other',
  queries text[] not null default '{}',
  sort    smallint not null default 0,
  active  boolean not null default true
);


-- ---------------------------------------------------------------------------
-- Businesses
-- ---------------------------------------------------------------------------
-- One row per business found. `category` and `city` are free text on purpose:
-- the category list lives in src/lib/biz.ts and will be edited more often than
-- this file, and a CHECK constraint there would mean a migration every time a
-- new search phrase is added.
create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  -- Local calendar day you found them. The equivalent of connects.sent_on.
  found_on      date not null default current_date,
  owner         text not null references public.users(id),

  name          text not null,
  category      text not null,
  city          text not null,

  -- Everything you dig up while researching. All optional: a business found on
  -- Maps with nothing but a name is still worth logging, it just sits at
  -- `found` until someone does the digging.
  address       text not null default '',
  website       text not null default '',
  facebook      text not null default '',
  instagram     text not null default '',
  maps_url      text not null default '',
  phone         text not null default '',
  -- E.164 with a leading +. This is the one that opens WhatsApp.
  whatsapp      text not null default '',
  email         text not null default '',

  -- found → researched → contacted → replied → lead, or off the side into
  -- unreachable (no contact channel exists) / closed (not interested).
  stage         text not null default 'found',
  note          text not null default '',
  tags          text[] not null default '{}',

  -- Milestone days, null until reached. These drive follow-up timing and the funnel.
  researched_on date,
  contacted_on  date,
  replied_on    date,
  lead_on       date,
  -- Day of the last message you sent; a follow-up becomes due 3 days after it.
  last_touch_on date,
  followups     smallint not null default 0 check (followups between 0 and 2),

  -- The duplicate key. A business is "the same" if it has the same website
  -- domain; failing that, the same name in the same city. Chains that share one
  -- site across branches collapse to a single row, which is correct — you only
  -- want to pitch the company once.
  dedupe_key    text generated always as (
                  coalesce(
                    nullif(
                      substring(lower(website) from '^(?:https?://)?(?:www\.)?([^/?#]+)'),
                      ''
                    ),
                    lower(btrim(name)) || '@' || lower(btrim(city))
                  )
                ) stored
);

-- `unreachable` was added after the first cut of this file; drop-and-recreate
-- so a table made by the earlier version accepts it.
alter table public.businesses drop constraint if exists businesses_stage_check;
alter table public.businesses add constraint businesses_stage_check
  check (stage in ('found','researched','contacted','replied','lead','unreachable','closed'));

-- The access patterns: "my businesses, newest first", "what's actionable",
-- and the sweep grid's "how many in this category × city".
create index if not exists businesses_owner_found_on_idx
  on public.businesses (owner, found_on desc);
create index if not exists businesses_created_at_idx
  on public.businesses (created_at desc);
create index if not exists businesses_cell_idx
  on public.businesses (city, category);
-- Partial: the queue only ever reads the stages that still need work.
create index if not exists businesses_open_stage_idx
  on public.businesses (stage, last_touch_on)
  where stage in ('found', 'researched', 'contacted', 'replied');

-- Global, not per-owner — same reasoning as connects_profile_slug_key. If Abdul
-- has already messaged a garage, Rishad must not message it again.
--
-- ⚠️ Will FAIL if the table already contains duplicates. Find them with:
--   select dedupe_key, count(*) from public.businesses
--   group by 1 having count(*) > 1;
create unique index if not exists businesses_dedupe_key
  on public.businesses (dedupe_key)
  where dedupe_key is not null;


-- ---------------------------------------------------------------------------
-- Sweeps
-- ---------------------------------------------------------------------------
-- One row per (category × city) cell that has been searched through. The grid
-- on /local reads this to grey out the cells that are done.
--
-- Team-wide, not per-owner: "cleaning services in Doha" only needs sweeping
-- once, and the point of sharing the tracker is not doing it twice. `owner`
-- records who did it, so the grid can say so.
create table if not exists public.biz_sweeps (
  category text not null,
  city     text not null,
  owner    text not null references public.users(id),
  swept_on date not null default current_date,
  -- How many businesses the sweep turned up. Denormalised on purpose: it is a
  -- record of what that search yielded on the day, not a live count of rows.
  found    smallint not null default 0,
  primary key (category, city)
);


-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- Identical to the connects side, and carrying the same caveat: sign-in is a
-- phone gate in the Next.js layer, so as far as Postgres is concerned the
-- publishable key is the only credential and these policies give anyone holding
-- it full access. `owner` is a record of who did the work, not a boundary.
alter table public.businesses enable row level security;
alter table public.biz_cities enable row level security;
alter table public.biz_categories enable row level security;
alter table public.biz_sweeps enable row level security;

drop policy if exists "anon full access" on public.businesses;
create policy "anon full access" on public.businesses
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on public.biz_cities;
create policy "anon full access" on public.biz_cities
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on public.biz_categories;
create policy "anon full access" on public.biz_categories
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on public.biz_sweeps;
create policy "anon full access" on public.biz_sweeps
  for all to anon using (true) with check (true);
