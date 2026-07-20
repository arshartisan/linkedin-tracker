# Reach

A daily LinkedIn outreach tracker. Paste a profile link the moment you send the
invite; the tally shows whether you're going to hit 30 today.

No sign-in. One person, one log.

## What it does

- **Today** — big count against the daily target, a 30-mark tally that fills as
  you log, and fast entry: paste a profile URL and the name is derived from it.
- **Duplicate guard** — warns if you've already logged that profile, with the
  date, before you double-send.
- **Status** — mark each connect Pending / Accepted / Ignored to get an
  acceptance rate.
- **History** — every connect grouped by day, searchable by name, link, note or
  tag.
- **Stats** — streak, weekly and monthly totals, average per active day, best
  day, a 14-day bar chart and a six-month heatmap.

The daily target defaults to 30 and is editable — click `/ 30` on the Today
screen.

## Running locally

```bash
npm install
npm run dev
```

It works immediately with no configuration, storing everything in browser
localStorage. Add Supabase to sync across devices.

## Adding Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. From **Project Settings → Data API**, copy the project URL and the `anon`
   public key into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. Restart `npm run dev`. The "saving to this browser only" notice disappears
   once the keys are picked up.

### A note on access

There's no authentication, so the anon key is the only thing guarding the data,
and the RLS policy in the schema grants that key full access. For a personal
tracker on a private Vercel URL that's a reasonable trade. If you ever share the
link, add Supabase Auth and scope the policies to `auth.uid()`.

## Deploying to Vercel

```bash
npx vercel
```

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under
**Project Settings → Environment Variables**, then redeploy. Without them the
deployment still runs, but each browser keeps its own separate log.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase.
