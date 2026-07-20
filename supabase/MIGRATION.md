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
