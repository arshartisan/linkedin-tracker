# Migrations

Two migrations live in `schema.sql`, both guarded and both safe to re-run:

1. **[Multi-user](#migrating-to-multi-user)** — the current one. Adds `users`,
   stamps every existing row as Arsh's, and makes duplicate profiles impossible.
2. **[Pipeline](#migrating-to-the-pipeline-schema)** — the earlier `status` →
   `stage` upgrade, kept here for reference.

---

# Migrating to multi-user

Three people now share the tracker. This migration adds a `users` table, an
`owner` column on `connects` backfilled to `arsh`, and a **global unique index**
on the LinkedIn profile so the same person can't be connected with twice.

**Do step 1 before anything else — the unique index is the one step that can
fail, and it fails on data you already have.**

## 1. Check for existing duplicates (do this first)

```sql
select substring(lower(profile_url) from 'linkedin\.com/(?:in|pub)/([^/?#]+)') as slug,
       count(*) as copies,
       array_agg(id) as ids
from public.connects
group by 1
having count(*) > 1;
```

If this returns nothing, you're clear — skip to step 2.

If it returns rows, decide which copy to keep for each slug (usually the one
furthest along the pipeline, or the earliest `sent_on`) and delete the rest by
id:

```sql
delete from public.connects where id in ('…', '…');
```

Re-run the check until it comes back empty. If you skip this, `create unique
index` aborts and the rest of the file still applies — you just won't have the
duplicate guard, and re-running after cleanup will add it.

## 2. Back up

```sql
create table connects_backup_multiuser as select * from public.connects;
```

## 3. Run `schema.sql`

Paste **the entire file** into the SQL editor and hit Run. The multi-user block
sits below the pipeline migration; running the file piecemeal will skip parts of
it.

## 4. Verify

Everything that existed is Arsh's:

```sql
select owner, count(*) from public.connects group by owner;
```

The three users exist with their goals:

```sql
select * from public.users;
```

The duplicate guard bites — this must fail with `23505`:

```sql
insert into public.connects (profile_url, owner)
select profile_url, 'abdul' from public.connects limit 1;
```

Nothing was lost:

```sql
select
  (select count(*) from public.connects)              as now,
  (select count(*) from connects_backup_multiuser)    as before;
```

## 5. Deploy

Set `AUTH_SECRET` in the deployment environment (any long random string —
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
before pushing. Without it the login route refuses to sign a session and nobody
can get in.

**Run the SQL first, then deploy.** The new build writes an `owner` on every
insert, so it needs the column to exist. The reverse order is safe too: `owner`
keeps its `'arsh'` default precisely so the old single-user build carries on
working against the migrated table until the new one goes live.

## What changes for you

- Everything already in the tracker shows up under Arsh. Abdul and Rishad start
  empty.
- Today, History, Queue and Leads are personal. **Team** (`/stats`) is the shared
  screen, with an All / per-person filter.
- The daily goal moved from browser storage into `users.daily_goal`, so it now
  follows you across devices — and each person sets their own. Existing browser
  goals are not migrated; set yours once on the Team screen.

## If it goes wrong

```sql
drop table public.connects;
alter table connects_backup_multiuser rename to connects;
```

Then re-apply the RLS policies from the bottom of `schema.sql`, since renaming a
table does not carry policies across.

---

# Migrating to the pipeline schema

The tracker moved from a three-value `status` (`pending` / `accepted` / `ignored`)
to a six-stage pipeline with milestone dates and follow-up tracking.

`schema.sql` does the upgrade in place. This file is the runbook.

**Run this before deploying the new code.** The app reads old rows fine, but
every *write* — marking someone accepted, messaged, or a lead — fails until the
`stage` column exists.

Everything below happens in the Supabase dashboard → **SQL Editor**.

---

## 1. Back up

The migration ends with `drop column status`, which cannot be undone. Take a
snapshot first:

```sql
create table connects_backup_20260720 as
  select * from public.connects;
```

Keep it a week or so, then `drop table connects_backup_20260720;` once you're
confident.

## 2. Migrate

Open a new query and paste **the entire contents of `schema.sql`** — all of it,
in one go. The `do $$ ... end $$` block partway down is what detects the old
`status` column and upgrades it; running the file piecemeal will skip it.

Hit **Run**.

Every statement is guarded, so the file is safe to re-run. If you're unsure
whether it applied, just run it again.

## 3. Verify

Confirm the new column exists and your rows mapped across:

```sql
select stage, count(*)
from public.connects
group by stage
order by count(*) desc;
```

Expect former `ignored` rows to show as `closed`, with `pending` and `accepted`
unchanged. If this query runs at all, `stage` exists and the migration took.

Confirm nothing was lost — these two numbers must match:

```sql
select
  (select count(*) from public.connects)            as now,
  (select count(*) from connects_backup_20260720)   as before;
```

## 4. Deploy

Push the code. The queue should populate on first load.

---

## What the migration does

| Before | After |
| --- | --- |
| `status = 'pending'` | `stage = 'pending'` |
| `status = 'accepted'` | `stage = 'accepted'`, `accepted_on` backfilled to `sent_on` |
| `status = 'ignored'` | `stage = 'closed'` |

It also adds `messaged_on`, `replied_on`, `lead_on`, `last_touch_on` and
`followups`, plus a partial index covering the stages the queue actually reads.

## Expect this on first load

Accepted rows get `accepted_on` backfilled to the day the invite was sent — a
best guess, because the old schema never recorded when someone accepted. Those
people will show up in the queue as **overdue for an opener**. That's correct
behaviour on guessed dates, not a bug; clear them or close them out.

Nobody gets a `messaged_on`. The old schema had no idea whether you'd already
sent an opener, so the pipeline assumes you haven't. If you know you already
messaged some of them, set their stage to **Messaged** in the app and the
follow-up clock starts from that moment.

## If it goes wrong

The backup table holds the pre-migration state. To restore:

```sql
drop table public.connects;
alter table connects_backup_20260720 rename to connects;
```

Then re-apply the RLS policy from the bottom of `schema.sql`, since renaming a
table does not carry policies across.

## Caveat

This migration has not been run against a live Postgres instance — it is
careful, guarded SQL, but step 1 is your real safety net.
