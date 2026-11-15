"use client";

import { useState } from "react";
import { BuildingIcon, CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FIELD } from "@/components/ui/layout";
import { cn } from "@/lib/utils";
import type { UserId } from "@/lib/types";
import {
  LEAD_CHANNELS, LEAD_CHANNEL_LABEL, LEAD_STATUSES, LEAD_STATUS_LABEL, RELATION_LABEL,
  ago, engineStore, gmailComposeUrl, safeHref,
  type EngineLead, type LeadChannel, type LeadStatus,
} from "@/lib/engine";

const CONFIDENCE: Record<string, string> = {
  high: "border-brand-edge bg-brand-soft text-brand-tint",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  low: "border-line bg-well text-muted",
};
const STATUS_TONE: Record<LeadStatus, string> = {
  new: "text-text", checked: "text-sky-300", contacted: "text-brand-tint", replied: "text-brand", dismissed: "text-muted",
};
const LINKS: [keyof EngineLead["channels"], string][] = [
  ["email", "Email"], ["linkedin", "LinkedIn"], ["x", "X"], ["contact_form", "Contact form"], ["website", "Website"], ["phone", "Phone"],
];

/** Where "Open" should take the person for a written message. */
function openUrl(lead: EngineLead): string | undefined {
  const d = lead.draft;
  if (!d) return undefined;
  if (d.channel === "email") return lead.channels.email ? gmailComposeUrl({ to: lead.channels.email, subject: d.subject, body: d.body }) : undefined;
  return safeHref(lead.channels[d.channel === "x" ? "x" : d.channel]);
}

function LeadCard({ lead, me, online, jobTitle, onSelectJob, onChanged }: {
  lead: EngineLead; me: UserId; online: boolean; jobTitle?: string;
  onSelectJob?: (jobKey: string) => void; onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState<string | null>(null);   // unsaved edit of the message
  const [note, setNote] = useState<string | null>(null);

  async function act(fn: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await fn(); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  const body = text ?? lead.draft?.body ?? "";
  const available = LEAD_CHANNELS.filter((c) => lead.channels[c]);
  const writing = lead.draft_requested;
  const limit = lead.draft?.channel === "linkedin" ? 300 : lead.draft?.channel === "x" ? 280 : null;
  const Icon = lead.kind === "company" ? BuildingIcon : UserIcon;
  const dismissed = lead.status === "dismissed";

  async function copy() {
    try { await navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setError("Couldn't copy. Select the text and copy it by hand."); }
  }

  return (
    <li className={cn("flex flex-col gap-2.5 border-b border-line-soft px-4 py-3 last:border-b-0", dismissed && "opacity-55")}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <span className="font-medium">{lead.name}</span>
            <span className="rounded border border-line px-1.5 text-[10px] text-muted">{RELATION_LABEL[lead.relation]}</span>
            <span className={cn("rounded border px-1.5 text-[10px]", CONFIDENCE[lead.confidence])}>{lead.confidence}</span>
          </p>
          <p className="text-xs text-muted">{[lead.role, lead.company, lead.location].filter(Boolean).join(" · ")}</p>
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="sr-only">Status of {lead.name}</span>
          <select value={lead.status} disabled={busy}
            onChange={(e) => void act(() => engineStore.updateLead(lead, { status: e.target.value as LeadStatus }, me))}
            className={cn("h-7 rounded-md border border-line bg-well px-1.5 text-xs", STATUS_TONE[lead.status])}>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      </div>

      {jobTitle && (
        <p className="text-xs text-muted">
          Found while researching{" "}
          {onSelectJob
            ? <button type="button" onClick={() => onSelectJob(lead.job_key)} className="text-text underline decoration-line underline-offset-2 hover:decoration-text">{jobTitle}</button>
            : <span className="text-text">{jobTitle}</span>} · {ago(lead.created_at)}
        </p>
      )}
      {lead.why && <p className="text-xs"><span className="text-muted">Why: </span>{lead.why}</p>}
      {lead.found_via && (
        <p className="text-xs text-muted">
          Found via: <span className="text-text/90">{lead.found_via}</span>
          {safeHref(lead.source_url) && <> · <a href={safeHref(lead.source_url)} target="_blank" rel="noopener noreferrer" className="underline decoration-line underline-offset-2 hover:text-text">source</a></>}
        </p>
      )}
      {lead.approach && <p className="text-xs"><span className="text-muted">Suggested approach: </span>{lead.approach}</p>}

      <div className="flex flex-wrap gap-1.5">
        {LINKS.filter(([k]) => lead.channels[k]).map(([k, label]) => {
          const value = lead.channels[k] as string;
          const href = k === "email" ? `mailto:${value}` : k === "phone" ? `tel:${value}` : safeHref(value);
          return href ? (
            <a key={k} href={href} target={k === "email" || k === "phone" ? undefined : "_blank"} rel="noopener noreferrer" title={value}
              className="inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-line px-2 text-[11px] hover:border-text/40">
              <span className="truncate">{k === "email" || k === "phone" ? value : label}</span>
              {k !== "email" && k !== "phone" && <ExternalLinkIcon className="size-3 shrink-0 text-muted" />}
            </a>
          ) : <span key={k} className="inline-flex h-6 items-center rounded-full border border-line px-2 text-[11px]">{label}: {value}</span>;
        })}
        {!LINKS.some(([k]) => lead.channels[k]) && <span className="text-[11px] text-muted">No contact details found yet.</span>}
      </div>

      {!dismissed && available.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted">Write a message for:</span>
          {available.map((c: LeadChannel) => (
            <Button key={c} variant="secondary" size="sm" disabled={busy || !online || Boolean(writing)}
              title={online ? undefined : "The worker is offline"}
              onClick={() => void act(async () => { setText(null); await engineStore.requestLeadMessage(lead, c, me); })}>
              {writing === c && <Loader2Icon className="animate-spin" />}{LEAD_CHANNEL_LABEL[c]}
            </Button>
          ))}
          {writing && <span role="status" className="text-[11px] text-sky-300">The worker is writing it…</span>}
        </div>
      )}
      {lead.draft_error && <p role="alert" className="text-xs text-rose">Couldn&apos;t write the message: {lead.draft_error}</p>}

      {lead.draft && !dismissed && (
        <div className="well flex flex-col gap-2 rounded-card border border-line-soft p-3">
          <p className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
            <span>{LEAD_CHANNEL_LABEL[lead.draft.channel]} message · written {ago(lead.draft.at)}</span>
            {limit && <span className={cn("tabular-nums", body.length > limit && "text-rose")}>{body.length} / {limit} characters</span>}
          </p>
          {lead.draft.channel === "email" && lead.draft.subject && <p className="text-xs"><span className="text-muted">Subject: </span>{lead.draft.subject}</p>}
          <textarea aria-label={`Message for ${lead.name}`} value={body} rows={Math.min(12, Math.max(3, Math.ceil(body.length / 90)))}
            onChange={(e) => setText(e.target.value)} className={cn(FIELD, "min-h-16 resize-y py-2 text-xs leading-relaxed")} />
          <div className="flex flex-wrap items-center gap-1.5">
            {text !== null && text !== lead.draft.body && (
              <Button variant="secondary" size="sm" disabled={busy}
                onClick={() => void act(async () => { await engineStore.saveLeadMessage(lead, body, lead.draft!.subject); setText(null); })}>Save edits</Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => void copy()}>{copied ? <><CheckIcon />Copied</> : <><CopyIcon />Copy</>}</Button>
            {openUrl(lead) && (
              <Button variant="secondary" size="sm" asChild>
                <a href={openUrl(lead)} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon />Open {lead.draft.channel === "email" ? "in Gmail" : LEAD_CHANNEL_LABEL[lead.draft.channel]}
                </a>
              </Button>
            )}
            {lead.status !== "contacted" && lead.status !== "replied" && (
              <Button size="sm" disabled={busy}
                onClick={() => void act(() => engineStore.markLeadContacted(lead, LEAD_CHANNEL_LABEL[lead.draft!.channel], me))}>
                I sent it – mark contacted
              </Button>
            )}
          </div>
        </div>
      )}
      {lead.contacted_at && (
        <p className="text-[11px] text-brand-tint">Contacted by {lead.contacted_via || "message"} · {new Date(lead.contacted_at).toLocaleString()}</p>
      )}

      <div className="flex items-center gap-1.5">
        <input aria-label={`Note on ${lead.name}`} placeholder="Add a note…" value={note ?? lead.note}
          onChange={(e) => setNote(e.target.value)} className={cn(FIELD, "h-7 flex-1 text-xs")} />
        {note !== null && note !== lead.note && (
          <Button variant="secondary" size="sm" disabled={busy}
            onClick={() => void act(async () => { await engineStore.updateLead(lead, { note }, me); setNote(null); })}>Save</Button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-rose">{error}</p>}
    </li>
  );
}

/** Lead candidates found during research: who, why, how to reach them, and a message per channel. */
export function LeadList({ leads, me, online, jobTitles, onSelectJob, onChanged, empty }: {
  leads: EngineLead[]; me: UserId; online: boolean;
  /** job_key → title; when given, each card says which job it came from. */
  jobTitles?: Record<string, string>;
  onSelectJob?: (jobKey: string) => void;
  onChanged: () => void;
  empty?: string;
}) {
  if (!leads.length) return <p className="p-4 text-sm text-muted">{empty ?? "No leads yet."}</p>;
  return (
    <ul className="flex flex-col">
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} me={me} online={online} jobTitle={jobTitles?.[lead.job_key]}
          onSelectJob={onSelectJob} onChanged={onChanged} />
      ))}
    </ul>
  );
}
