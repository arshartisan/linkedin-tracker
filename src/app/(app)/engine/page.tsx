"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIcon, PauseIcon, PlayIcon, RefreshCwIcon } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { ActivityFeed } from "@/components/engine/ActivityFeed";
import { JOB_FILTERS, JobList, matchesFilter, type JobFilter } from "@/components/engine/JobList";
import { Insights } from "@/components/engine/Insights";
import { JobWaterfall } from "@/components/engine/JobWaterfall";
import { LeadList } from "@/components/engine/LeadList";
import { MachineCheck } from "@/components/engine/MachineCheck";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Page, PageHeader, Segmented, Stat } from "@/components/ui/layout";
import { cn } from "@/lib/utils";
import {
  ago, engineStore, workerOnline,
  type EngineCommand, type EngineEvent, type EngineHealth, type EngineJob, type EngineJobSummary, type EngineLead, type EngineWorker,
} from "@/lib/engine";

const STATUS_TEXT: Record<EngineWorker["status"], string> = {
  idle: "Idle", collecting: "Collecting jobs", working: "Working", waiting_human: "Needs a person",
  paused: "Paused", error: "Problem", stopped: "Stopped",
};

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function EnginePage() {
  const { me, mode } = useData();
  const [jobs, setJobs] = useState<EngineJobSummary[]>([]);
  const [worker, setWorker] = useState<EngineWorker | null>(null);
  const [commands, setCommands] = useState<EngineCommand[]>([]);
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [job, setJob] = useState<EngineJob | null>(null);
  const [jobEvents, setJobEvents] = useState<EngineEvent[]>([]);
  const [filter, setFilter] = useState<JobFilter>("ready");
  const [panel, setPanel] = useState<"job" | "activity" | "leads" | "insights">("activity");
  const [leads, setLeads] = useState<EngineLead[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(mode === "supabase");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [health, setHealth] = useState<{ result: EngineHealth; at: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const selectedRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [jobRows, workerRow, commandRows, eventRows] = await Promise.all([
        engineStore.jobs(), engineStore.worker(), engineStore.commands(), engineStore.events({ limit: 200 }),
      ]);
      setJobs(jobRows); setWorker(workerRow); setCommands(commandRows); setEvents(eventRows);
      // Leads live in their own table; a database without it still shows the rest.
      setLeads(await engineStore.leads().catch(() => []));
      const id = selectedRef.current;
      if (id) {
        const full = await engineStore.job(id);
        setJob(full);
        setJobEvents(full ? await engineStore.events({ jobKey: full.job_key, limit: 300 }) : []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the engine.");
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, []);

  // Poll while the tab is visible: fast enough to watch the worker, quiet when hidden.
  useEffect(() => {
    if (mode !== "supabase") return;
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 5000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first); window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mode, refresh]);

  function select(id: string) {
    setSelectedId(id); setPanel("job"); setJob(null); setJobEvents([]);
    selectedRef.current = id;
    void refresh();
  }
  function selectByKey(jobKey: string) {
    const match = jobs.find((row) => row.job_key === jobKey);
    if (match) select(match.id);
  }

  async function command(name: EngineCommand["command"], args: Record<string, unknown> = {}) {
    setBusy(true);
    try { await engineStore.command(name, me.id, args); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Command failed."); }
    finally { setBusy(false); }
  }

  async function checkMachine() {
    setChecking(true);
    try {
      const res = await fetch("/api/engine/health", { cache: "no-store" });
      const result: EngineHealth = res.ok
        ? await res.json()
        : { reachable: false, ms: 0, reason: `Reach couldn't run the check (HTTP ${res.status}).` };
      setHealth({ result, at: Date.now() });
    } catch (e) {
      setHealth({ result: { reachable: false, ms: 0, reason: `Reach couldn't run the check: ${e instanceof Error ? e.message : String(e)}` }, at: Date.now() });
    } finally {
      setChecking(false);
    }
  }

  const online = workerOnline(worker, now);
  const paused = Boolean(worker?.capabilities.paused) || worker?.status === "paused";
  const pendingCollect = commands.find((c) => c.command === "collect" && (c.status === "pending" || c.status === "running"));
  const lastCommand = commands[0];
  const today = startOfToday();
  const counts = useMemo(() => {
    const live = jobs.filter((j) => !j.skipped);
    return {
      today: jobs.filter((j) => !j.duplicate_note && new Date(j.created_at).getTime() >= today).length,
      ready: live.filter((j) => matchesFilter(j, "ready")).length,
      review: live.filter((j) => matchesFilter(j, "review")).length,
      progress: live.filter((j) => matchesFilter(j, "progress")).length,
      sent: live.filter((j) => j.stage === "sent").length,
      sentToday: live.filter((j) => j.stage === "sent" && j.sent_at && new Date(j.sent_at).getTime() >= today).length,
    };
  }, [jobs, today]);
  const filtered = jobs.filter((j) => matchesFilter(j, filter));
  const newLeads = leads.filter((l) => l.status === "new").length;
  const jobTitles = useMemo(() => Object.fromEntries(jobs.map((j) => [j.job_key, j.title])), [jobs]);
  const alerts = events.filter((e) => e.level === "alert" && new Date(e.created_at).getTime() > now - 6 * 3600_000);

  if (mode !== "supabase") {
    return (
      <Page>
        <PageHeader title="Upwork Engine" />
        <EmptyState title="The engine needs shared storage">
          Connect Supabase (see the README) so the Windows worker and Reach can share jobs.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Upwork Engine"
        lead="Runs on the Windows machine: collects jobs, analyses the client, finds the founder, verifies the email and writes it. You review and send."
        actions={
          <>
            <span className={cn(
              "inline-flex h-[26px] items-center gap-2 rounded-full border px-2.5 text-[12px]",
              !online ? "border-[#4c2324] bg-rose-soft text-[#febfc6]"
                : worker?.status === "waiting_human" ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : "border-brand-edge bg-brand-soft text-brand-tint",
            )}>
              <span className={cn("size-1.5 rounded-full", online ? "bg-brand" : "bg-rose", online && worker?.status !== "idle" && "animate-pulse")} />
              {!worker ? "Engine never connected" : online ? STATUS_TEXT[worker.status] : "Offline"}
            </span>
            <Button variant="secondary" size="sm" disabled={busy || !online} onClick={() => void command(paused ? "resume" : "pause")}>
              {paused ? <><PlayIcon />Resume</> : <><PauseIcon />Pause</>}
            </Button>
            <div className="flex items-center gap-1.5">
              <Input type="number" min={1} max={25} value={limit} aria-label="Jobs to collect"
                onChange={(e) => setLimit(Math.max(1, Math.min(25, Number(e.target.value) || 1)))} className="h-8 w-16 text-xs md:text-xs" />
              <Button size="sm" disabled={busy || !online || Boolean(pendingCollect)} onClick={() => void command("collect", { limit, ignore_hours: true })}>
                {pendingCollect ? "Collecting…" : "Collect now"}
              </Button>
            </div>
            <Button variant="secondary" size="sm" disabled={checking} onClick={() => void checkMachine()}
              title="Ask the Windows machine directly (through Tailscale Funnel)">
              <ActivityIcon />{checking ? "Checking…" : "Check machine"}
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Refresh" onClick={() => void refresh()}><RefreshCwIcon /></Button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {health && <MachineCheck result={health.result} at={health.at} onClose={() => setHealth(null)} />}
        {/* Alerts: machine off, a person needed, recent alert events */}
        {worker && !online && (
          <div role="alert" className="rounded-card border border-[#4c2324] bg-rose-soft px-4 py-3 text-sm text-[#febfc6]">
            <b>Engine offline</b> — last heard from {worker.id} {ago(worker.last_seen, now)}
            {worker.last_seen && <> ({new Date(worker.last_seen).toLocaleString()})</>}. Check that the Windows machine is on, awake, online and logged in.
          </div>
        )}
        {!worker && !loading && !error && (
          <div className="rounded-card border border-line-soft px-4 py-3 text-sm text-muted">
            No worker has connected yet. Start <code>start-engine.bat</code> on the Windows machine (see upwork/engine/README.md).
          </div>
        )}
        {online && worker?.status === "waiting_human" && (
          <div role="alert" className="rounded-card border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
            <b>Needs a person on the Windows machine:</b> {worker.detail}
          </div>
        )}
        {alerts.length > 0 && (
          <div className="rounded-card border border-[#4c2324] px-4 py-3 text-xs text-[#febfc6]">
            <p className="label mb-1 text-rose">Alerts in the last 6 hours</p>
            <ul className="flex flex-col gap-0.5">{alerts.slice(0, 4).map((a) => <li key={a.id}>{new Date(a.created_at).toLocaleTimeString()} — {a.message}</li>)}</ul>
          </div>
        )}
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border border-line-soft p-4 text-sm text-rose">
            {error}<Button variant="secondary" size="sm" onClick={() => void refresh()}>Retry</Button>
          </div>
        )}

        <section className="card grid grid-cols-2 gap-5 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat value={`${counts.today}/${worker?.capabilities.daily_limit ?? "–"}`} caption="Collected today" />
          <Stat value={counts.progress} caption="In progress" />
          <Stat value={counts.review} caption="Needs review" tone={counts.review ? "rose" : "text"} />
          <Stat value={counts.ready} caption="Ready to send" tone={counts.ready ? "brand" : "text"} />
          <Stat value={counts.sentToday} caption="Sent today" />
          <div className="min-w-0 text-xs text-muted">
            <p className="truncate">{online ? worker?.detail || "Waiting for work" : "—"}</p>
            <p className="mt-1 truncate">Schedule: {worker?.capabilities.collect_times || "—"}</p>
            <p className="mt-1 truncate">{lastCommand ? `Last request: ${lastCommand.command} · ${lastCommand.status}${lastCommand.result ? ` · ${lastCommand.result}` : ""}` : ""}</p>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <section aria-label="Engine jobs" className="card self-start overflow-hidden">
            <div className="overflow-x-auto border-b border-line-soft p-2">
              <Segmented label="Filter jobs" value={filter} onChange={setFilter}
                options={JOB_FILTERS.map((f) => ({ value: f.value, label: f.label }))} />
            </div>
            <div className="max-h-[calc(100vh-320px)] min-h-40 overflow-auto">
              {loading ? <p role="status" className="p-4 text-sm text-muted">Loading…</p>
                : filtered.length ? <JobList jobs={filtered} selectedId={selectedId} onSelect={select} />
                  : <p className="p-4 text-sm text-muted">{jobs.length ? "Nothing here." : "No jobs collected yet."}</p>}
            </div>
            <p aria-live="polite" className="border-t border-line-soft px-4 py-2 text-[11px] text-muted">{filtered.length} of {jobs.length} jobs · {counts.sent} sent in total</p>
          </section>

          <div className="min-w-0">
            <Segmented label="Panel" className="mb-3" value={panel} onChange={setPanel}
              options={[
                { value: "job", label: "Job details" }, { value: "activity", label: "All activity" },
                { value: "leads", label: `Leads${newLeads ? ` · ${newLeads} new` : ""}` }, { value: "insights", label: "Insights" },
              ]} />
            {panel === "activity" ? (
              <section className="card overflow-hidden">
                <div className="max-h-[calc(100vh-280px)] overflow-auto">
                  <ActivityFeed events={events} onSelectJob={selectByKey} empty="The engine hasn't reported anything yet." />
                </div>
              </section>
            ) : panel === "leads" ? (
              <section className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-4 py-2.5 text-xs text-muted">
                  <span>People and companies found during research, across all jobs.</span>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={showDismissed} onChange={(e) => setShowDismissed(e.target.checked)} />Show dismissed
                  </label>
                </div>
                <div className="max-h-[calc(100vh-320px)] overflow-auto">
                  <LeadList leads={leads.filter((l) => showDismissed || l.status !== "dismissed")} me={me.id} online={online}
                    jobTitles={jobTitles} onSelectJob={selectByKey} onChanged={() => void refresh()}
                    empty="No leads yet. They appear here as the worker researches jobs." />
                </div>
              </section>
            ) : panel === "insights" ? (
              <Insights jobs={jobs} leads={leads} />
            ) : job ? (
              <JobWaterfall key={job.id} job={job} events={jobEvents} worker={online ? worker : null} me={me.id} onChanged={() => void refresh()}
                leads={leads.filter((l) => l.job_key === job.job_key)} onSelectJob={select}
                siblings={job.client_key ? jobs.filter((o) => o.client_key === job.client_key && o.id !== job.id) : []} />
            ) : selectedId ? (
              <p role="status" className="p-4 text-sm text-muted">Loading job…</p>
            ) : (
              <EmptyState title="Pick a job">Choose a job on the left to see every step: what was found, how, and the email.</EmptyState>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
