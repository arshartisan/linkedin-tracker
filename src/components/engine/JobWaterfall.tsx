"use client";

import { useState } from "react";
import { CheckIcon, ExternalLinkIcon, FileSearchIcon, Loader2Icon, MessageSquareTextIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip, FIELD } from "@/components/ui/layout";
import { ActivityFeed } from "./ActivityFeed";
import { cn } from "@/lib/utils";
import { USER_LABEL, type UserId } from "@/lib/types";
import {
  ENGINE_STEPS, FEEDBACK_LABEL, FEEDBACK_VERDICTS, STEP_LABEL, ago, engineStore, gmailComposeUrl, safeHref, stepDone,
  type Draft, type EngineEvent, type EngineJob, type EngineJobSummary, type EngineLead, type EngineStep, type EngineWorker, type TraceEntry,
} from "@/lib/engine";
import { ClientScore } from "@/components/engine/ClientScore";
import { LeadList } from "@/components/engine/LeadList";

type CardState = "done" | "running" | "waiting" | "held" | "failed" | "locked";

const CONFIDENCE_TONE: Record<string, string> = {
  high: "border-brand-edge bg-brand-soft text-brand-tint",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  low: "border-[#4c2324] bg-rose-soft text-[#febfc6]",
  none: "border-[#4c2324] bg-rose-soft text-[#febfc6]",
};

function Tag({ value, map = CONFIDENCE_TONE }: { value: string | null | undefined; map?: Record<string, string> }) {
  const key = (value || "none").toLowerCase();
  return <span className={cn("inline-flex h-5 items-center rounded-full border px-2 text-[11px]", map[key] ?? map.none)}>{value || "none"}</span>;
}

const EMAIL_TONE: Record<string, string> = {
  valid: CONFIDENCE_TONE.high, risky: CONFIDENCE_TONE.medium, domain_ok: CONFIDENCE_TONE.medium,
  unknown: CONFIDENCE_TONE.medium, invalid: CONFIDENCE_TONE.low, none: CONFIDENCE_TONE.low,
};

function A({ href, children }: { href: string | null | undefined; children?: React.ReactNode }) {
  const safe = safeHref(href);
  if (!safe) return <span>{children ?? href ?? "—"}</span>;
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="break-all text-text underline decoration-line underline-offset-2 hover:decoration-text">
      {children ?? safe}
    </a>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
      {shown.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StepCard({ n, title, state, action, children }: {
  n: number; title: string; state: CardState; action?: React.ReactNode; children?: React.ReactNode;
}) {
  const marker = {
    done: <CheckIcon className="size-3.5" />,
    running: <Loader2Icon className="size-3.5 animate-spin" />,
    failed: <span className="text-[13px] font-semibold">!</span>,
    held: <span className="text-[13px] font-semibold">?</span>,
    waiting: <span className="tabular text-[12px]">{n}</span>,
    locked: <span className="tabular text-[12px]">{n}</span>,
  }[state];
  const tone = {
    done: "border-brand bg-brand text-ink",
    running: "border-sky-300/60 bg-sky-400/10 text-sky-300",
    failed: "border-rose/60 bg-rose-soft text-rose",
    held: "border-amber-400/50 bg-amber-400/10 text-amber-300",
    waiting: "border-line bg-surface-2 text-text",
    locked: "border-line-soft bg-well text-muted",
  }[state];
  const status = {
    done: null, running: "Working…", failed: "Failed", held: "Waiting for you",
    waiting: "Runs automatically", locked: "Waiting for the previous step",
  }[state];
  return (
    <li className="group relative pl-11">
      <span aria-hidden className="absolute top-9 bottom-0 left-[13px] w-px bg-line-soft group-last:hidden" />
      <span className={cn("absolute top-3.5 left-0 grid size-7 place-items-center rounded-full border", tone)}>{marker}</span>
      <section className={cn("card mb-3 p-4", state === "locked" && "opacity-60")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-medium">{title}</h3>
            {status && <span className={cn("text-[11px]", state === "failed" ? "text-rose" : state === "held" ? "text-amber-300" : "text-muted")}>{status}</span>}
          </div>
          {action && <div className="flex flex-wrap items-center gap-1.5">{action}</div>}
        </div>
        {children && <div className="mt-3 flex flex-col gap-3">{children}</div>}
      </section>
    </li>
  );
}

function TraceList({ trace }: { trace: TraceEntry[] }) {
  if (!trace.length) return <p className="text-xs text-muted">No web activity recorded.</p>;
  return (
    <ol className="flex flex-col gap-1.5">
      {trace.map((entry, index) => (
        <li key={index} className="flex gap-2 text-xs">
          <span className="tabular mt-0.5 w-5 shrink-0 text-right text-muted/60">{index + 1}</span>
          {entry.type === "search" && (
            <div className="min-w-0 flex-1">
              <p><SearchIcon className="mr-1 inline size-3 text-muted" />Searched <span className="text-text">“{entry.query}”</span></p>
              {entry.results?.length ? (
                <details className="mt-0.5">
                  <summary className="cursor-pointer text-[11px] text-muted hover:text-text">{entry.results.length} results</summary>
                  <ul className="mt-1 flex flex-col gap-0.5 border-l border-line-soft pl-2">
                    {entry.results.map((result) => <li key={result.url} className="truncate"><A href={result.url}>{result.title || result.url}</A></li>)}
                  </ul>
                </details>
              ) : null}
            </div>
          )}
          {entry.type === "fetch" && (
            <div className="min-w-0 flex-1">
              <p><FileSearchIcon className="mr-1 inline size-3 text-muted" />Opened <A href={entry.url} />{entry.ok === false && <span className="text-rose"> (couldn’t read)</span>}</p>
              {entry.looking_for && <p className="mt-0.5 text-[11px] text-muted">Looking for: {entry.looking_for}</p>}
            </div>
          )}
          {entry.type === "note" && (
            <p className="min-w-0 flex-1 text-muted"><MessageSquareTextIcon className="mr-1 inline size-3" />{entry.text}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

export function JobWaterfall({
  job, events, leads, siblings, worker, me, onChanged, onSelectJob,
}: {
  job: EngineJob;
  events: EngineEvent[];
  /** Leads found while researching this job. */
  leads: EngineLead[];
  /** Other jobs from the same Upwork client. */
  siblings: EngineJobSummary[];
  onSelectJob: (id: string) => void;
  worker: EngineWorker | null;
  me: UserId;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Unsaved edits sit on top of the stored draft, so a fresh draft from the
  // worker shows up immediately unless someone is mid-edit.
  const [edit, setEdit] = useState<Draft | null>(null);
  const draft: Draft = edit ?? job.draft ?? { to: "", subject: "", body: "" };
  const dirty = edit !== null;
  const setDraft = (next: Draft) => setEdit(next);
  const setDirty = (value: boolean) => { if (!value) setEdit(null); };
  const [gmailOpened, setGmailOpened] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  async function act(fn: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await fn(); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setBusy(false); }
  }
  const request = (step: EngineStep) => act(() => engineStore.requestStep(job, step, me));
  const saveDraft = () => act(async () => { await engineStore.saveDraft(job, draft, me); setDirty(false); });

  const sent = job.stage === "sent";
  const usage = (job.intel?.usage?.cost_usd ?? 0) + (job.enrich?.usage?.cost_usd ?? 0) + (job.draft?.usage?.cost_usd ?? 0);
  const workerBusyHere = Boolean(job.running_step || job.requested_step);

  function stateOf(step: EngineStep | "collect"): CardState {
    if (step !== "collect" && (job.running_step === step || job.requested_step === step)) return "running";
    if (step !== "collect" && job.error.startsWith(`${step}:`)) return "failed";
    if (stepDone(job.stage, step)) return "done";
    const index = ENGINE_STEPS.indexOf(step as EngineStep);
    const previous = index === 0 ? "collect" : ENGINE_STEPS[index - 1];
    if (!stepDone(job.stage, previous)) return "locked";
    if (step === "send") return "held";
    return job.hold_reason ? "held" : "waiting";
  }

  function stepAction(step: EngineStep, state: CardState) {
    if (job.skipped) return null;
    if (state === "failed") return <Button size="sm" disabled={busy} onClick={() => request(step)}>Retry</Button>;
    if (state === "held" && step !== "send") return <Button size="sm" disabled={busy} onClick={() => request(step)}>Continue anyway</Button>;
    if (state === "done" && !sent && step !== "send") {
      return <Button variant="ghost" size="sm" disabled={busy || workerBusyHere} onClick={() => request(step)}>Redo</Button>;
    }
    return null;
  }

  const c = job.captured, i = job.intel, e = job.enrich, v = job.verify;
  const s = { analyse: stateOf("analyse"), enrich: stateOf("enrich"), verify: stateOf("verify"), draft: stateOf("draft"), send: stateOf("send") };
  const errorFor = (step: EngineStep) => job.error.startsWith(`${step}:`)
    ? <p role="alert" className="rounded-control bg-rose-soft px-3 py-2 text-xs text-rose">{job.error.slice(step.length + 1).trim()}</p> : null;
  const holdFor = (step: EngineStep) => job.hold_reason && stepDone(job.stage, step) && !stepDone(job.stage, ENGINE_STEPS[ENGINE_STEPS.indexOf(step) + 1])
    ? <p className="rounded-control border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">{job.hold_reason}</p> : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-snug font-medium">{job.title || "(untitled job)"}</h2>
            <p className="mt-1 text-xs text-muted">
              <A href={job.upwork_url}>Open on Upwork <ExternalLinkIcon className="inline size-3" /></A> · collected {ago(job.created_at)}
              {job.sent_by && <> · sent by {USER_LABEL[job.sent_by]}</>}
            </p>
          </div>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => act(() => engineStore.setSkipped(job, !job.skipped, me))}>
            {job.skipped ? "Restore job" : "Skip job"}
          </Button>
        </div>
        {job.duplicate_note && <p className="mt-3 text-xs text-amber-300">{job.duplicate_note}</p>}
        {error && <p role="alert" className="mt-3 rounded-control bg-rose-soft px-3 py-2 text-xs text-rose">{error}</p>}
      </header>

      <ol className="group/steps flex flex-col">
        {/* 1. Collect */}
        <StepCard n={1} title={STEP_LABEL.collect} state="done">
          <Facts rows={[
            ["Collected", new Date(job.created_at).toLocaleString()],
            ["From", job.feed ? <A href={job.feed}>{job.feed.replace(/^https:\/\/www\.upwork\.com/, "")}</A> : null],
            ["Captured", c ? `${c.page_text.length.toLocaleString()} characters${c.reviews_seen !== undefined ? ` · ~${c.reviews_seen} reviews` : ""}` : "nothing (skipped)"],
          ]} />
          {c && (
            <details>
              <summary className="cursor-pointer text-xs text-muted hover:text-text">Show the captured page text</summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded-control bg-well p-3 text-[11px] whitespace-pre-wrap text-muted">{c.page_text}</pre>
            </details>
          )}
        </StepCard>

        {/* 2. Analyse */}
        <StepCard n={2} title={STEP_LABEL.analyse} state={s.analyse} action={stepAction("analyse", s.analyse)}>
          {errorFor("analyse")}
          {i && <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-medium">{i.client_name || "Name not found"}</span>
              <Tag value={i.client_name_confidence} />
            </div>
            {i.name_evidence?.map((ev) => (
              <blockquote key={ev.quote} className="border-l-2 border-brand/60 bg-well px-3 py-1.5 text-xs">
                “{ev.quote}” <span className="text-muted">— {ev.source}</span>
              </blockquote>
            ))}
            {i.client_score && <ClientScore score={i.client_score} />}
            {siblings.length > 0 && (
              <div className="well rounded-card border border-line-soft p-3 text-xs">
                <p className="label mb-1.5">Same client · {siblings.length} other job{siblings.length === 1 ? "" : "s"}</p>
                <ul className="flex flex-col gap-1">
                  {siblings.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-baseline gap-x-2">
                      <button type="button" onClick={() => onSelectJob(o.id)} className="text-left text-text underline decoration-line underline-offset-2 hover:decoration-text">{o.title}</button>
                      <span className="text-muted">{o.stage}{o.sent_at ? ` · emailed ${new Date(o.sent_at).toLocaleDateString()}` : ""} · collected {ago(o.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Facts rows={[
              ["Location", [i.city, i.country].filter(Boolean).join(", ")],
              ["Company hint", i.company_name],
              ["Spent · hire rate", [i.total_spent, i.hire_rate].filter(Boolean).join(" · ")],
              ["Rating", i.rating !== null ? `${i.rating} (${i.reviews_count ?? "?"} reviews)` : null],
              ["Member since", i.member_since],
              ["Budget", i.budget],
              ["This job", [i.job_type, i.experience_level, i.posted && `posted ${i.posted}`, i.proposals && `${i.proposals} proposals`,
                i.interviewing ? `${i.interviewing} interviewing` : null].filter(Boolean).join(" · ")],
              ["Summary", i.job_summary],
              ["How they work", i.client_personality_notes],
            ]} />
            {i.past_jobs?.length > 0 && (
              <details>
                <summary className="cursor-pointer text-xs text-muted hover:text-text">Past jobs and reviews ({i.past_jobs.length})</summary>
                <ul className="mt-2 flex flex-col gap-1.5 text-xs">
                  {i.past_jobs.map((p, index) => (
                    <li key={index}><span className="text-text">{p.title}</span>
                      {(p.amount_or_rate || p.dates) && <span className="text-muted tabular-nums"> · {[p.amount_or_rate, p.dates].filter(Boolean).join(" · ")}</span>}
                      {p.freelancer_feedback && <span className="text-muted"> — “{p.freelancer_feedback}”</span>}</li>
                  ))}
                </ul>
              </details>
            )}
          </>}
        </StepCard>

        {/* 3. Find founder */}
        <StepCard n={3} title={STEP_LABEL.enrich} state={s.enrich} action={stepAction("enrich", s.enrich)}>
          {errorFor("enrich")}
          {e && <>
            <div className="well p-3">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="label">Conclusion</span>
                <Tag value={e.match_confidence} />
                {!e.identified && <Chip tone="rose">not identified</Chip>}
              </div>
              <p className="text-[13px]">{e.conclusion}</p>
              {e.reasoning && <p className="mt-1.5 text-xs text-muted">{e.reasoning}</p>}
            </div>
            {e.check && e.check.verdict !== "skipped" && (
              <div className="well p-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="label">Second check</span>
                  <Chip tone={e.check.verdict === "confirmed" ? "brand" : "rose"}>{e.check.verdict}</Chip>
                  <Tag value={e.check.confidence} />
                </div>
                {e.check.concern && <p className="text-xs">{e.check.concern}</p>}
                <ul className="mt-2 flex flex-col gap-1 text-xs">
                  {e.check.checks.map((c) => (
                    <li key={c.check} className="grid grid-cols-[1rem_minmax(5rem,max-content)_1fr] gap-x-2">
                      <span aria-hidden className={c.result === "match" ? "text-brand" : c.result === "conflict" ? "text-rose" : "text-muted"}>
                        {c.result === "match" ? "✓" : c.result === "conflict" ? "✕" : "?"}
                      </span>
                      <span className="text-muted">{c.check}<span className="sr-only">: {c.result}</span></span>
                      <span>{c.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {holdFor("enrich")}
            {leads.length > 0 && (
              <div className="overflow-hidden rounded-card border border-line-soft">
                <p className="label border-b border-line-soft px-4 py-2.5">
                  Leads found while researching this job · {leads.length}
                </p>
                <LeadList leads={leads} me={me} online={Boolean(worker)} onChanged={onChanged} />
              </div>
            )}
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="well p-3">
                <p className="label mb-2">Founder</p>
                <Facts rows={[
                  ["Name", e.founder.name && <span className="font-medium">{e.founder.name}</span>],
                  ["Role", e.founder.role],
                  ["Location", e.founder.location],
                  ["LinkedIn", e.founder.linkedin && <A href={e.founder.linkedin} />],
                  ["X", e.founder.x_twitter && <A href={e.founder.x_twitter} />],
                  ["Email", e.founder.email_found && <>{e.founder.email_found.value} <A href={e.founder.email_found.source_url}>source</A></>],
                  ["Guesses", e.founder.email_guesses?.join(", ")],
                  ["Why", e.founder.email_pattern_evidence],
                  ["Profiles", e.founder.other_profiles?.length ? <div className="flex flex-col">{e.founder.other_profiles.map((p) => <A key={p.value} href={p.value.startsWith("http") ? p.value : p.source_url}>{p.value}</A>)}</div> : null],
                ]} />
              </div>
              <div className="well p-3">
                <p className="label mb-2">Company</p>
                <Facts rows={[
                  ["Name", e.company.name && <span className="font-medium">{e.company.name}</span>],
                  ["Website", e.company.website && <A href={e.company.website} />],
                  ["Location", e.company.location],
                  ["About", e.company.description],
                  ["LinkedIn", e.company.linkedin && <A href={e.company.linkedin} />],
                  ["X", e.company.x_twitter && <A href={e.company.x_twitter} />],
                  ["Emails", e.company.emails?.length ? <div className="flex flex-col">{e.company.emails.map((m) => <span key={m.value}>{m.value} <A href={m.source_url}>source</A></span>)}</div> : null],
                  ["Phones", e.company.phones?.length ? <div className="flex flex-col">{e.company.phones.map((m) => <span key={m.value}>{m.value} <A href={m.source_url}>source</A></span>)}</div> : null],
                  ["Links", e.company.other_links?.length ? <div className="flex flex-col">{e.company.other_links.map((m) => <A key={m.value} href={m.value.startsWith("http") ? m.value : m.source_url}>{m.value}</A>)}</div> : null],
                ]} />
              </div>
            </div>
            {e.research_steps?.length > 0 && (
              <div>
                <p className="label mb-1.5">How it searched</p>
                <ol className="flex list-decimal flex-col gap-1 pl-5 text-xs text-text/90">
                  {e.research_steps.map((step, index) => <li key={index}>{step}</li>)}
                </ol>
              </div>
            )}
            <details open>
              <summary className="label cursor-pointer">Search trail · {e.trace?.filter((t) => t.type === "search").length ?? 0} searches · {e.trace?.filter((t) => t.type === "fetch").length ?? 0} pages</summary>
              <div className="mt-2"><TraceList trace={e.trace ?? []} /></div>
            </details>
            {e.sources?.length > 0 && (
              <details>
                <summary className="cursor-pointer text-xs text-muted hover:text-text">Sources ({e.sources.length})</summary>
                <ul className="mt-1 flex flex-col gap-0.5 text-xs">{e.sources.map((u) => <li key={u}><A href={u} /></li>)}</ul>
              </details>
            )}
          </>}
        </StepCard>

        {/* 4. Verify */}
        <StepCard n={4} title={STEP_LABEL.verify} state={s.verify} action={stepAction("verify", s.verify)}>
          {errorFor("verify")}
          {v && <>
            {v.checked.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted"><tr><th className="py-1 pr-3 font-normal">Email</th><th className="py-1 pr-3 font-normal">Type</th><th className="py-1 pr-3 font-normal">Status</th><th className="py-1 font-normal">Check</th></tr></thead>
                  <tbody>
                    {v.checked.map((row) => (
                      <tr key={row.email} className="border-t border-line-soft align-top">
                        <td className="py-1.5 pr-3">{row.email === v.chosen ? <span className="font-medium">{row.email} ✓</span> : row.email}</td>
                        <td className="py-1.5 pr-3 text-muted">{row.kind}</td>
                        <td className="py-1.5 pr-3"><Tag value={row.status} map={EMAIL_TONE} /></td>
                        <td className="py-1.5 text-muted">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-xs text-muted">No email addresses were found to check.</p>}
            {v.needs_review && v.chosen && <p className="text-xs text-amber-300">The chosen address isn’t confirmed deliverable. Double-check it before sending.</p>}
            {holdFor("verify")}
          </>}
        </StepCard>

        {/* 5. Draft */}
        <StepCard n={5} title={STEP_LABEL.draft} state={s.draft} action={stepAction("draft", s.draft)}>
          {errorFor("draft")}
          {job.draft && <>
            <label className="flex flex-col gap-1 text-xs text-muted">To
              <Input value={draft.to} disabled={sent} onChange={(ev) => { setDraft({ ...draft, to: ev.target.value }); }} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">Subject
              <Input value={draft.subject} disabled={sent} onChange={(ev) => { setDraft({ ...draft, subject: ev.target.value }); }} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">Email
              <textarea className={cn(FIELD, "min-h-64 resize-y text-[13px] leading-relaxed")} value={draft.body} disabled={sent}
                onChange={(ev) => { setDraft({ ...draft, body: ev.target.value }); }} />
            </label>
            {!sent && (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" disabled={busy || !dirty} onClick={() => void saveDraft()}>Save edits</Button>
                <span className="text-[11px] text-muted">
                  {dirty ? "Unsaved changes" : job.draft.edited_by ? `Edited by ${USER_LABEL[job.draft.edited_by]}` : `Written by the engine ${ago(job.draft.at)}`}
                </span>
              </div>
            )}
          </>}
        </StepCard>

        {/* 6. Send */}
        <StepCard n={6} title={STEP_LABEL.send} state={s.send}>
          {errorFor("send")}
          {job.sent ? (
            <div className="well p-3 text-xs">
              <Facts rows={[
                ["Sent", new Date(job.sent.at).toLocaleString()],
                ["By", job.sent.by ? USER_LABEL[job.sent.by] : job.sent_by ? USER_LABEL[job.sent_by] : null],
                ["Via", job.sent.via + (job.sent.from ? ` (${job.sent.from})` : "")],
                ["To", job.sent.to],
                ["Subject", job.sent.subject],
              ]} />
              <pre className="mt-2 rounded-control bg-surface p-3 text-[12px] whitespace-pre-wrap text-text/90">{job.sent.body}</pre>
            </div>
          ) : job.draft && !job.skipped ? (
            <>
              <p className="text-xs text-muted">Read the email above, then send it. Edits are saved first, and the exact email sent is stored here.</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" disabled={busy || !draft.to} onClick={() => act(async () => {
                  if (dirty) { await engineStore.saveDraft(job, draft, me); setDirty(false); }
                  window.open(gmailComposeUrl(draft), "_blank", "noopener");
                  setGmailOpened(true);
                })}>Open in Gmail</Button>
                {gmailOpened && <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => engineStore.markSent(job, draft, me))}>I sent it – mark as sent</Button>}
                {worker?.capabilities.smtp && (confirmSend ? (
                  <>
                    <span className="text-xs">Send to <b>{draft.to}</b> from {worker.capabilities.from_email}?</span>
                    <Button size="sm" disabled={busy} onClick={() => act(async () => {
                      if (dirty) { await engineStore.saveDraft(job, draft, me); setDirty(false); }
                      await engineStore.requestStep(job, "send", me);
                      setConfirmSend(false);
                    })}>Yes, send</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmSend(false)}>Cancel</Button>
                  </>
                ) : (
                  <Button size="sm" variant="secondary" disabled={busy || !draft.to || workerBusyHere} onClick={() => setConfirmSend(true)}>
                    Send from {worker.capabilities.from_email}
                  </Button>
                ))}
              </div>
              {!draft.to && <p className="text-xs text-amber-300">Add a recipient address in the draft first.</p>}
            </>
          ) : null}
        </StepCard>
      </ol>

      {job.enrich && (
        <section className="card p-4" aria-label="Rate this result">
          <p className="label mb-2">Rate this result</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {FEEDBACK_VERDICTS.map((v) => (
              <Button key={v} size="sm" variant={job.feedback?.verdict === v ? "default" : "secondary"} disabled={busy}
                aria-pressed={job.feedback?.verdict === v}
                onClick={() => void act(() => engineStore.setFeedback(job, job.feedback?.verdict === v ? null : v, job.feedback?.note ?? "", me))}>
                {FEEDBACK_LABEL[v]}
              </Button>
            ))}
          </div>
          {job.feedback && (
            <p className="mt-2 text-xs text-muted">
              Rated by {USER_LABEL[job.feedback.by]} · {new Date(job.feedback.at).toLocaleString()}. Ratings feed the Insights panel.
            </p>
          )}
          {usage > 0 && <p className="mt-2 text-[11px] text-muted">Claude usage for this job: about ${usage.toFixed(2)} at API prices.</p>}
        </section>
      )}

      <section className="card overflow-hidden">
        <p className="label border-b border-line-soft px-4 py-3">Job activity</p>
        <div className="max-h-96 overflow-auto"><ActivityFeed events={events} showJob={false} empty="No activity for this job yet." /></div>
      </section>
    </div>
  );
}
