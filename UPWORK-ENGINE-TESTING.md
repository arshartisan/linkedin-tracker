# Upwork Engine: setup and testing guide

The Upwork Engine is an automated pipeline. A worker on a Windows machine collects Upwork jobs and runs
each one through these steps by itself, until an email draft is ready:

```
① Collect → ② Analyse client → ③ Find founder & company → ④ Verify email → ⑤ Write email → ⑥ Send
```

Reach (**Upwork → Engine**) shows every step and every activity, including each web search, the pages
opened, how the conclusion was reached, and the email written. A person reviews the email and sends it.
The email that was sent is stored with the job.

- **Reach code:** this repo (merged to `main`, deployed on Vercel)
- **Worker code:** the `upwork/` folder (`upwork/engine` and `upwork/option5-stealth`). It is **not in this
  repo**: copy the whole `upwork` folder to the Windows machine.
- **Detailed worker docs:** `upwork/engine/README.md`

---

## 1. Set up Reach (about 5 min)

1. Open **Supabase → SQL editor** and run these two files, in order. Both are safe to run again.
   - `supabase/migrations/20261114_upwork_engine.sql` (engine tables)
   - `supabase/migrations/20261115_engine_leads.sql` (leads, same-client links and ratings)
   - `supabase/migrations/20261116_engine_settings.sql` (your profile, edited in Reach)

   A new, empty project needs only `supabase/schema.sql`, which includes both.
2. Confirm the Vercel deploy of `main` succeeded.
3. Open **Upwork → Engine** in Reach. It should say **"No worker has connected yet"**.
   - If it says *"Engine storage is not set up yet"*, step 1 didn't run.

---

## 2. Set up the Windows machine (about 30 min)

Do this on the machine that will run all day.

1. **Install** Python 3.11+, Google Chrome, and the Claude Code CLI.
   Run `claude` once and log in with the **Pro/Max** account. The engine uses that subscription, not an API key.
2. **Copy** the `upwork` folder to the machine.
3. **Install the worker** (PowerShell, in `upwork\option5-stealth`):
   ```powershell
   python -m venv .venv
   .venv\Scripts\pip install -r requirements.txt -r ..\engine\requirements.txt
   .venv\Scripts\patchright install chrome
   ```
4. **Log in to Upwork** (still in `option5-stealth`):
   ```powershell
   .venv\Scripts\python main.py login
   ```
   Sign in in the window that opens, tick **"Keep me logged in"**, then press Enter in the terminal.
   If reCAPTCHA doesn't load, close everything and log in with plain Chrome on the same profile instead:
   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="<full path>\upwork\option5-stealth\profile" https://www.upwork.com/ab/account-security/login
   ```
   Close that Chrome window completely afterwards.
5. **Set up alerts:** create a free check at [healthchecks.io](https://healthchecks.io) with
   **Period 5 min** and **Grace 5 min**. Add your email, Telegram, WhatsApp or Slack under **Integrations**,
   then copy the check's **ping URL**.
6. **Configure** (in `upwork\engine`): `copy .env.example .env`, then fill in:

   | Setting | Value |
   |---|---|
   | `SUPABASE_URL` | Same as Reach's `NEXT_PUBLIC_SUPABASE_URL` |
   | `SUPABASE_KEY` | Same as Reach's `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
   | `HEALTHCHECK_URL` | The healthchecks.io ping URL |
   | `DAILY_LIMIT` | **2** while testing (raise later) |
   | `COLLECT_TIMES` | e.g. `10:00,13:30,16:30` |
   | `ACTIVE_HOURS` | e.g. `9-19` |
   | `ALERT_WEBHOOK_URL` | Optional: a Discord or Slack webhook for instant alerts |
   | `HUNTER_API_KEY` | Optional: checks that the mailbox exists, not just the domain |
   | `HEALTH_TOKEN` | A long random secret for Reach's **Check machine** button (step 9). Make one with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
   | `HEALTH_PORT` | Leave at `8787` |
   | `TARGET_HOURLY_RATE` | The hourly rate you want, in USD (default `30`). Clients who pay less score lower |
   | `MIN_CLIENT_SCORE` | Hold jobs whose client scores below this (0–100) before the web research, to save Claude usage. `0` (default) never holds |

7. **Write your profile:** in Reach, open **Upwork → Engine → Profile** and replace the starter text with
   your real name, link, services and case studies, then **Save profile**. The worker uploads
   `templates/my_profile.md` there on its first start, and falls back to that file if Reach has no profile.
   Adjust `cold_email.txt` if needed. The drafts are only as good as this profile.
8. **Check the setup:**
   ```powershell
   ..\option5-stealth\.venv\Scripts\python worker.py check
   ```
   Every required line should say **OK**, and it should say `HEALTH_TOKEN set (port 8787)`.
9. **Set up the live check (Tailscale Funnel).** This lets Reach ask the machine directly how it is,
   without opening any ports on the router:
   1. Install [Tailscale](https://tailscale.com/download/windows) and sign in. It runs as a Windows service,
      so it starts on boot, even before anyone logs in.
   2. In the [Tailscale admin console](https://login.tailscale.com/admin/dns), turn on **MagicDNS** and
      **HTTPS Certificates**.
   3. In PowerShell (as administrator):
      ```powershell
      tailscale funnel --bg 8787
      ```
      The first time, it prints a link to allow Funnel for this machine in your access policy. Open it,
      approve, and run the command again. `--bg` keeps the Funnel on after reboots.
   4. `tailscale funnel status` shows the public address, e.g. `https://upwork-pc.tail1234.ts.net`.
   5. In **Vercel → Project Settings → Environment Variables** add the following, then **redeploy**:

      | Variable | Value |
      |---|---|
      | `ENGINE_HEALTH_URL` | The Funnel address from step 4 (no `/health` at the end) |
      | `ENGINE_HEALTH_TOKEN` | The same value as `HEALTH_TOKEN` in the worker's `.env` |

   The worker only listens on `127.0.0.1`, and every request must carry the token, so the public address
   gives nothing away without it. Never put the token in a `NEXT_PUBLIC_` variable.

---

## 3. First run, watched

1. Double-click `upwork\engine\start-engine.bat`, and keep the window open to watch the log.
2. In Reach, the status should change to **Online** within about 30 seconds.
   Click **Check machine**: it should say **"Machine answered: all good"** and list each check
   (connection to Reach, Claude CLI, disk space). The Upwork and Claude lines appear after their first use.
3. In Reach, set the number next to **Collect now** to **1** and click **Collect now**.
4. Watch:
   - **On the Windows machine:** Chrome opens Upwork, scrolls the feed, opens a job, expands the reviews, and goes back.
   - **In Reach, All activity:** "Opening job…", "Collected…", then the analysis, every web search, the pages
     opened, the conclusion, the email check and "Draft ready".
5. Within about 2–5 minutes the job reaches **Ready**. Open it and read all six steps.

---

## 4. Check the quality (most important)

For the first 5–10 jobs, open each one and check:

- [ ] **Right company and founder?** Open the source links. Is it really the client behind the job?
- [ ] **Confidence:** do *high* matches turn out right? Do *low* matches get held instead of guessed?
- [ ] **Held jobs** (the "Review" filter): how often does it fail to identify the company, and why?
- [ ] **Email:** is the chosen address sensible (founder's address before a generic one)?
- [ ] **Draft:** is it specific to the job, accurate, and something you'd actually send?
- [ ] **Client score** (on the Analyse step, and the A–D badge in the job list): do the reasons match what
      you see on the job page? Tier A–D comes from spend, rate paid against `TARGET_HOURLY_RATE`, hire rate,
      reviews and activity; **New** means the client has no history yet.
- [ ] **Second check:** after the research names a company, a sceptical second pass looks for reasons it's
      the wrong person (location, timeline, names, type of business). A *doubtful* result holds the job with
      the concern; a *rejected* one counts as not identified. Do its concerns make sense?
- [ ] **Leads** (the **Leads** panel, and on each job): every person and company the research came across,
      with why it's linked, where it was found and every way to reach it. Useful when no email was found.
- [ ] **Same client:** jobs from one client are linked (shown on each job). If that client was already
      emailed, the new job is held instead of drafting a second email.

**Rate each result** with the buttons under the job (**Good lead**, **Wrong person**, **Wrong company**,
**Weak email**, **Not a fit for us**). The ratings appear in the **Insights** panel, together with the
pipeline funnel, lead outcomes, clients by tier and Claude usage per job. That's how you'll see whether the
research is getting better.

Note anything wrong, such as a wrong founder, a weak draft or a failed step. The research instructions and
the template can be tuned from real examples.

---

## 5. Test the buttons (safely)

- [ ] **Redo** a finished step: it reruns, and the later steps rebuild automatically.
- [ ] **Continue anyway** on a held job, and **Skip job** / **Restore job**.
- [ ] Edit the draft and **Save edits**. The edit should stay put while the page refreshes.
- [ ] **Pause**, then **Resume** (the worker status changes within a few seconds).
- [ ] **Sending test:** change **To** to **your own email**, click **Open in Gmail**, send it to yourself,
      then click **I sent it – mark as sent**. Check that the sent email is stored on the job.
- [ ] **Leads:** on a lead, click **Email** or **LinkedIn** under *Write a message for*. The worker writes it
      within about 30 seconds (LinkedIn notes stay under 280 characters). Edit it, change the lead's status
      (New → Checked → Contacted → Replied, or Dismissed) and add a note.

> Don't email real founders until you trust the research.

---

## 6. Test the alerts and the live check

- [ ] Close the worker window. Click **Check machine** straight away: it should say the machine is on
      but the worker isn't running. Reach shows **Engine offline** within about 2 minutes, and healthchecks.io
      alerts you within about 10 minutes.
- [ ] Start it again. Reach shows **Online**, **Check machine** says all good, and healthchecks.io reports the
      check is back up.
- [ ] Turn off Wi-Fi on the machine (or put it to sleep). **Check machine** should say
      *"No answer in 10 s"*. Turn it back on.
- [ ] If Upwork shows a captcha during collection, the alert says someone must solve it on the
      machine (it waits 30 minutes). Reach shows **Needs a person** with the reason.

**How the two checks fit together:** **Check machine** is a live question you ask from Reach. It answers in
a second and tells you *what* is wrong. But it only runs when you click it. healthchecks.io watches all day
and alerts you when nobody is looking. Keep both.

What else raises an alert: Upwork logged out, the Claude usage limit reached or the CLI logged out,
3 failed steps in a row, or no connection to Supabase for 5+ minutes.

---

## 7. Make it unattended

1. In PowerShell, in `upwork\engine`:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install-windows.ps1
   ```
   This starts the engine when you log in, restarts it if it crashes, and turns off sleep and hibernate on mains power.
2. **Reboot** and confirm the engine starts by itself after login.
3. Turn on **automatic sign-in** for this Windows user (run `netplwiz`). Otherwise a Windows Update
   restart leaves the engine off until someone logs in. healthchecks.io will alert you if that happens.
4. Keep the user **logged in**; the screen may turn off. If you use Remote Desktop, don't leave the session
   *disconnected*, because the browser can't run in it.

---

## 8. Let it run

- Keep `DAILY_LIMIT` at **2–3 jobs a day** for a few days. Watch:
  - how often Upwork shows a captcha;
  - Claude subscription usage;
  - how accurate the founder matches are.
- When it's stable and accurate, raise `DAILY_LIMIT` toward **10**. Restart the worker after editing `.env`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Reach: *"Engine storage is not set up yet"* | Run the SQL migration (section 1) |
| Check machine: *"Not set up"* | Add `ENGINE_HEALTH_URL` and `ENGINE_HEALTH_TOKEN` in Vercel, then redeploy (section 2, step 9) |
| Check machine: *"rejected the token"* | `HEALTH_TOKEN` (worker `.env`) and `ENGINE_HEALTH_TOKEN` (Vercel) differ. Make them the same, restart the worker and redeploy |
| Check machine: *"worker isn't running"* | The machine and Tailscale are up, but the engine isn't. Log in to Windows or run `start-engine.bat` |
| Check machine: *"No answer in 10 s"* | Machine off, asleep or offline, or Tailscale stopped. On the machine: `tailscale status` and `tailscale funnel status` |
| Reach stays **Offline** | Is the worker window running? Check `.env` Supabase values with `worker.py check`, and the machine's internet |
| Alert: Upwork logged out | Repeat the Upwork login (section 2, step 4) |
| reCAPTCHA won't load | Log in with plain Chrome on the profile (section 2, step 4) |
| Alert: Claude usage limit | Steps pause for 60 minutes and resume on their own. Lower `DAILY_LIMIT` or set `CLAUDE_MODEL=sonnet` |
| Alert: Claude not logged in | Run `claude` on the machine and log in |
| A step shows **Failed** | Read the error on the step card, then click **Retry** |
| A job is stuck on **Review** | The company or email wasn't found. Check the research, then **Continue anyway** or **Skip** |
| Machine logs | The worker console window, and `upwork\engine\engine.log` |
| Profile panel: *"Profile storage is not set up yet"* | Run `supabase/migrations/20261116_engine_settings.sql`, then restart the worker so it uploads the profile |
| Engine page: a column or `engine_leads` is missing | Run `supabase/migrations/20261115_engine_leads.sql` |

## Good to know

- **Replay mode (tuning without Upwork):** `python worker.py import` loads job pages saved earlier in
  `option5-stealth\output` instead of browsing Upwork. The running worker then runs every step on them, so you
  can change the profile or research instructions and compare results with no captcha risk.
  Options: `--limit 5`, a file or folder path, `--keep-intel` (reuse the saved analysis) and `--again`
  (start jobs that already exist over). Only full captures (a few thousand characters, with reviews) are
  useful; captures from before 15 Nov 2026 only hold the client sidebar.

- **Separate test data:** engine data is kept apart from the manual Jobs, Companies and Contacts. Sent engine
  emails don't feed Reach's Queue or follow-ups yet.
- **Funnel address:** the Tailscale Funnel address is public, but without the token it only returns
  "bad token". To turn it off: `tailscale funnel --https=443 off`.
- **Shared access:** the engine tables use Reach's existing access model. Anyone with the publishable key
  can read them, including founder emails.
- **Upwork's rules:** contacting Upwork clients outside Upwork can get the account suspended under its
  anti-circumvention rule.
