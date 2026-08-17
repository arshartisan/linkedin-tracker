# Reach

An outreach tracker for a small team, in two halves.

**LinkedIn** is one-to-one: paste a profile link the moment you send the invite;
the tally shows whether you're going to hit your number today, and nobody on the
team connects with the same person twice.

**Local** is a sweep: sixteen trades × however many cities, searched one cell at
a time. Log what each search turns up, dig the WhatsApp number out of their
website or Facebook page, and message them.

Sign in with your mobile number. Three people share both pipelines.

## LinkedIn

- **Today** — big count against your daily target, a tally that fills as you
  log, and fast entry: paste a profile URL and the name is derived from it.
- **Duplicate guard** — a hard stop if *anyone* on the team has already logged
  that profile, naming who has them and when. Backed by a unique index, so it
  holds even when two people paste the same link at once.
- **Pipeline** — move each connect along Pending → Accepted → Messaged →
  Replied → Lead, with follow-ups falling due automatically.
- **History** — your connects grouped by day, searchable by name, link, note or
  tag.
- **Queue** — who needs a message from you, and when.
- **Leads** — your funnel, step by step, and how long a connect takes to become
  a lead.
- **Team** — the shared screen. Everyone's connects per day, accept rate, reply
  rate and leads, filterable down to one person, plus a side-by-side table of
  all three.

Today, History, Queue and Leads are yours alone. Team is the only screen that
shows everybody.

The daily target is per person and defaults to 30 — click `/ 30` on the Today
screen to change yours. It's stored on your user record, so it follows you
across devices.

## Local

Finding local businesses is an infinite task with no natural edge, so the
section gives it a finite shape: a grid of every trade against every city, and
the job becomes filling in cells.

- **Prospect** — the grid. Each cell is one search; open it for ready-made
  Google Maps, Google and Facebook links, log what they turn up, and tick the
  cell off. Swept cells go quiet, so what's left is what's left.
- **Queue** — two lanes, kept apart because they're different sittings.
  *Research* is digging numbers out of websites and Facebook pages; *Message* is
  openers, follow-ups and replies that are due.
- **Pipeline** — everything logged, filterable by stage, city, trade and person.
- **Leads** — the funnel (Found → Number found → Messaged → Replied → Lead), how
  long a business takes to convert, and which trades actually pay.

The pipeline is `found → researched → contacted → replied → lead`, with two
dead ends: `closed` when they're not interested, and `unreachable` when there's
genuinely no way to contact them — a separate stage so nobody re-researches
them a fortnight later.

**Cities** are editable from the chip row above the grid. Give each one a
country dialling code: it's what turns a number copied off a Qatari shop's page
as `05512 3456` into the `+974…` form WhatsApp will actually open. Retiring a
city hides its column without touching the businesses logged against it.

**Trades** live in `CATEGORIES` in [`src/lib/biz.ts`](src/lib/biz.ts) — sixteen
of them, several with more than one phrasing, because a Qatari "gents saloon"
and a British "barbershop" are the same shop and neither search finds the other.

**Message templates** live in [`src/lib/biz-message.ts`](src/lib/biz-message.ts).
They're starting points: the queue fills one in and drops it into a textarea you
edit before WhatsApp opens. Rewrite them once you know what lands.

**Duplicate guard**, same as the LinkedIn side: a business is "the same" if it
shares a website domain, or failing that a name in the same city. Backed by a
unique index, so it holds when two people log the same garage at once.

## Signing in

Three numbers are recognised, listed in `src/lib/auth.ts`. Enter one on the
login screen and you stay signed in for a year; the sign-out control sits in the
sidebar footer (and next to the logo on mobile).

This is a gate, not an identity system: the number *is* the credential, there's
no SMS step, and anyone who knows a number can sign in as that person. That's a
deliberate trade for a private team tool. See the note on access below.

## Running locally

```bash
npm install
npm run dev
```

It works immediately with no configuration, storing everything in browser
localStorage — which means each person would have their own separate log, so
Supabase is what makes the shared pipeline actually shared. Development falls
back to a fixed signing secret; production requires `AUTH_SECRET`.

## Adding Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). **Do this
   before setting the keys below** — once the keys are present the app talks to
   Supabase instead of localStorage, so a missing table surfaces as an error
   rather than a silent fallback.

   Upgrading an existing single-user database? Follow
   [`supabase/MIGRATION.md`](supabase/MIGRATION.md) instead — it backfills every
   existing row to Arsh and tells you how to clear duplicates before the unique
   index goes on.
3. Then run [`supabase/local.sql`](supabase/local.sql) for the Local section. It
   must go second: its tables reference `public.users`, which the first file
   creates and seeds. It also seeds Newport, Doha and Lusail as the starting
   cities.
4. From **Project Settings → API keys**, copy the project URL and the
   publishable key into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Older projects issue an `anon` key (`eyJ...`) instead; set it as
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and it is picked up as a fallback.

5. Restart `npm run dev`. The "saving to this browser only" notice disappears
   once the keys are picked up.

### A note on access

Sign-in is a phone-number gate in the Next.js layer — a signed, HttpOnly cookie
checked by `src/proxy.ts` — not Supabase Auth. As far as Postgres is concerned
the publishable key is still the only credential, and the RLS policy in the
schema grants it full access.

So the gate stops someone loading the app; it does not stop someone who pulls
the key out of the JavaScript bundle. The `owner` column — on both `connects`
and `businesses` — is a record of who did the work, not an enforced boundary. For a team tracker on a private
Vercel URL that's a reasonable trade. To close it properly, move reads and
writes behind route handlers using a service-role key, or adopt Supabase Auth
and scope the policies to `auth.uid()`.

## Deploying to Vercel

```bash
npx vercel
```

Under **Project Settings → Environment Variables** add:

| Variable | |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key |
| `AUTH_SECRET` | any long random string — `openssl rand -hex 32` |

Then redeploy. `AUTH_SECRET` is **required**: without it the login route refuses
to sign a session and nobody can get in. Without the Supabase keys the
deployment still runs, but each browser keeps its own separate log.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase.
