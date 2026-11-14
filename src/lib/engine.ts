import { hasSupabase, supabase } from "./supabase";
import { USER_LABEL, type UserId } from "./types";

/*
  The Upwork Engine: a worker on a Windows machine collects Upwork jobs and runs
  each one through analyse → find founder → verify → draft on its own. Reach
  shows every step and every activity, and is where a person reviews and sends.
  Buttons here never run anything directly - they write a request the worker
  picks up within a few seconds.
*/

export const ENGINE_STEPS = ["analyse", "enrich", "verify", "draft", "send"] as const;
export type EngineStep = (typeof ENGINE_STEPS)[number];
export type EngineStage = "collected" | "analysed" | "enriched" | "verified" | "drafted" | "sent";

export const STEP_LABEL: Record<EngineStep | "collect", string> = {
  collect: "Collect job",
  analyse: "Analyse client",
  enrich: "Find founder & company",
  verify: "Verify email",
  draft: "Write email",
  send: "Send",
};

const STAGE_RANK: Record<EngineStage, number> = { collected: 0, analysed: 1, enriched: 2, verified: 3, drafted: 4, sent: 5 };
const STEP_RANK: Record<EngineStep, number> = { analyse: 1, enrich: 2, verify: 3, draft: 4, send: 5 };

export function stepDone(stage: EngineStage, step: EngineStep | "collect"): boolean {
  return step === "collect" || STAGE_RANK[stage] >= STEP_RANK[step];
}

export type Sourced = { value: string; source_url: string };

export type Intel = {
  job_title: string;
  job_summary: string;
  budget: string | null;
  client_name: string | null;
  client_name_confidence: string;
  name_evidence: { candidate_name: string; quote: string; source: string }[];
  company_name: string | null;
  country: string | null;
  city: string | null;
  local_time: string | null;
  member_since: string | null;
  payment_verified: boolean | null;
  rating: number | null;
  reviews_count: number | null;
  total_spent: string | null;
  hire_rate: string | null;
  jobs_posted: number | null;
  avg_hourly_rate_paid: string | null;
  industry_or_company_size: string | null;
  past_jobs: { title: string; freelancer_feedback: string | null; client_feedback: string | null; rating_given_by_freelancer: number | null }[];
  other_open_jobs: string[];
  client_personality_notes: string;
  proposal_tips: string[];
};

export type TraceEntry =
  | { type: "search"; query: string; at: string; results?: { title: string; url: string }[] }
  | { type: "fetch"; url: string; looking_for?: string; at: string; ok?: boolean; summary?: string }
  | { type: "note"; text: string; at: string };

export type Enrichment = {
  identified: boolean;
  match_confidence: string;
  research_steps: string[];
  conclusion: string;
  reasoning: string;
  company: {
    name: string | null; website: string | null; domain: string | null; description: string | null; location: string | null;
    emails: Sourced[]; phones: Sourced[]; linkedin: string | null; x_twitter: string | null; other_links: Sourced[];
  };
  founder: {
    name: string | null; role: string | null; location: string | null; linkedin: string | null; x_twitter: string | null;
    other_profiles: Sourced[]; email_found: Sourced | null; email_guesses: string[]; email_pattern_evidence: string | null;
  };
  sources: string[];
  trace: TraceEntry[];
};

export type Verification = {
  checked: { email: string; kind: string; status: "valid" | "risky" | "domain_ok" | "unknown" | "invalid"; detail: string }[];
  chosen: string | null;
  needs_review: boolean;
  at: string;
};

/** A live check of the Windows machine through its Tailscale Funnel (GET /api/engine/health). */
export type HealthCheck = { ok: boolean; detail: string; at?: string };
export type EngineHealth =
  | {
      reachable: true;
      ms: number;
      report: {
        ok: boolean; time: string; status: string; detail: string; version: string; worker_id: string;
        uptime_s: number; paused: boolean; chrome_running: boolean; checks: Record<string, HealthCheck>;
      };
    }
  | { reachable: false; ms: number; reason: string };

export type Draft = { to: string; subject: string; body: string; at?: string; edited_by?: UserId };
export type Sent = { via: string; to: string; subject: string; body: string; at: string; by?: UserId | null; from?: string };

export type EngineJob = {
  id: string;
  job_key: string;
  upwork_url: string;
  title: string;
  feed: string;
  created_at: string;
  updated_at: string;
  stage: EngineStage;
  running_step: EngineStep | null;
  requested_step: EngineStep | null;
  requested_by: UserId | null;
  error: string;
  hold_reason: string;
  skipped: boolean;
  duplicate_note: string;
  captured: { url: string; title: string; page_text: string; reviews_seen?: number } | null;
  intel: Intel | null;
  enrich: Enrichment | null;
  verify: Verification | null;
  draft: Draft | null;
  sent: Sent | null;
  sent_by: UserId | null;
};

/** The list view: everything but the heavy JSON, plus a few fields pulled out of it. */
export type EngineJobSummary = Pick<EngineJob,
  "id" | "job_key" | "upwork_url" | "title" | "created_at" | "updated_at" | "stage" | "running_step" |
  "requested_step" | "error" | "hold_reason" | "skipped" | "duplicate_note" | "sent_by"> & {
  client_name: string | null; country: string | null; spent: string | null;
  company: string | null; founder: string | null; confidence: string | null; email: string | null; sent_at: string | null;
};

const LIST_COLUMNS = [
  "id", "job_key", "upwork_url", "title", "created_at", "updated_at", "stage", "running_step", "requested_step",
  "error", "hold_reason", "skipped", "duplicate_note", "sent_by",
  "client_name:intel->>client_name", "country:intel->>country", "spent:intel->>total_spent",
  "company:enrich->company->>name", "founder:enrich->founder->>name", "confidence:enrich->>match_confidence",
  "email:verify->>chosen", "sent_at:sent->>at",
].join(",");

export type EngineEvent = {
  id: number;
  created_at: string;
  worker_id: string;
  job_key: string | null;
  step: string;
  level: "info" | "warn" | "error" | "alert";
  message: string;
  data: Record<string, unknown> | null;
};

export type EngineWorker = {
  id: string;
  started_at: string | null;
  last_seen: string | null;
  status: "idle" | "collecting" | "working" | "waiting_human" | "paused" | "error" | "stopped";
  detail: string;
  capabilities: {
    version?: string; smtp?: boolean; hunter?: boolean; from_email?: string; model?: string;
    daily_limit?: number; collect_times?: string; active_hours?: string; paused?: boolean;
  };
};

export type EngineCommand = {
  id: string; created_at: string; created_by: UserId | null; command: "collect" | "pause" | "resume";
  args: Record<string, unknown>; status: "pending" | "running" | "done" | "failed"; result: string;
};

/** Heartbeats arrive every 30 s; two missed ones means the machine needs a look. */
export const OFFLINE_AFTER_MS = 2 * 60 * 1000;

export function workerOnline(worker: EngineWorker | null, now = Date.now()): boolean {
  if (!worker?.last_seen || worker.status === "stopped") return false;
  return now - new Date(worker.last_seen).getTime() < OFFLINE_AFTER_MS;
}

function fail(error: { code?: string; message: string }): never {
  if (error.code === "PGRST205" || error.code === "42P01") {
    throw new Error("Engine storage is not set up yet. Run supabase/migrations/20261114_upwork_engine.sql, then retry.");
  }
  throw new Error(error.message);
}

function needSupabase(): void {
  if (!hasSupabase) throw new Error("The Upwork Engine needs shared Supabase storage.");
}

export const engineStore = {
  async jobs(): Promise<EngineJobSummary[]> {
    needSupabase();
    const { data, error } = await supabase().from("engine_jobs").select(LIST_COLUMNS)
      .order("created_at", { ascending: false }).limit(500);
    if (error) fail(error);
    return (data ?? []) as unknown as EngineJobSummary[];
  },
  async job(id: string): Promise<EngineJob | null> {
    needSupabase();
    const { data, error } = await supabase().from("engine_jobs").select("*").eq("id", id).maybeSingle();
    if (error) fail(error);
    return data as EngineJob | null;
  },
  async events(opts: { jobKey?: string; limit?: number } = {}): Promise<EngineEvent[]> {
    needSupabase();
    let query = supabase().from("engine_events").select("*").order("id", { ascending: false }).limit(opts.limit ?? 150);
    if (opts.jobKey) query = query.eq("job_key", opts.jobKey);
    const { data, error } = await query;
    if (error) fail(error);
    return (data ?? []) as EngineEvent[];
  },
  async worker(): Promise<EngineWorker | null> {
    needSupabase();
    const { data, error } = await supabase().from("engine_workers").select("*")
      .order("last_seen", { ascending: false, nullsFirst: false }).limit(1);
    if (error) fail(error);
    return (data?.[0] ?? null) as EngineWorker | null;
  },
  async commands(): Promise<EngineCommand[]> {
    needSupabase();
    const { data, error } = await supabase().from("engine_commands").select("*")
      .order("created_at", { ascending: false }).limit(5);
    if (error) fail(error);
    return (data ?? []) as EngineCommand[];
  },

  /** Ask the worker to (re)run a step. Later steps are rebuilt automatically afterwards. */
  async requestStep(job: Pick<EngineJob, "id" | "job_key">, step: EngineStep, by: UserId): Promise<void> {
    const { data, error } = await supabase().from("engine_jobs")
      .update({ requested_step: step, requested_by: by, error: "", hold_reason: "" })
      .eq("id", job.id).is("running_step", null).select("id");
    if (error) fail(error);
    if (!data?.length) throw new Error("The worker is busy with this job right now. Try again when it finishes.");
    await this.note(job.job_key, step, `${USER_LABEL[by]} asked the worker to run "${STEP_LABEL[step]}"`);
  },
  async setSkipped(job: Pick<EngineJob, "id" | "job_key">, skipped: boolean, by: UserId): Promise<void> {
    const { error } = await supabase().from("engine_jobs").update({ skipped }).eq("id", job.id);
    if (error) fail(error);
    await this.note(job.job_key, "review", `${USER_LABEL[by]} ${skipped ? "skipped" : "restored"} this job`);
  },
  async saveDraft(job: Pick<EngineJob, "id" | "job_key">, draft: Draft, by: UserId): Promise<void> {
    const { error } = await supabase().from("engine_jobs").update({ draft: { ...draft, edited_by: by } }).eq("id", job.id);
    if (error) fail(error);
    await this.note(job.job_key, "draft", `${USER_LABEL[by]} edited the email`);
  },
  /** For emails sent by hand (Open in Gmail): store exactly what was sent. */
  async markSent(job: Pick<EngineJob, "id" | "job_key">, draft: Draft, by: UserId): Promise<void> {
    const sent: Sent = { via: "gmail (manual)", to: draft.to, subject: draft.subject, body: draft.body, at: new Date().toISOString(), by };
    const { error } = await supabase().from("engine_jobs")
      .update({ sent, stage: "sent", sent_by: by, draft: { ...draft, edited_by: draft.edited_by } }).eq("id", job.id);
    if (error) fail(error);
    await this.note(job.job_key, "send", `${USER_LABEL[by]} sent the email to ${draft.to} from Gmail`);
  },
  async command(command: EngineCommand["command"], by: UserId, args: Record<string, unknown> = {}): Promise<void> {
    needSupabase();
    const { error } = await supabase().from("engine_commands").insert({ command, args, created_by: by });
    if (error) fail(error);
  },
  /** Reach-side actions go into the same activity log as the worker's. */
  async note(jobKey: string | null, step: string, message: string): Promise<void> {
    await supabase().from("engine_events").insert({ worker_id: "reach", job_key: jobKey, step, level: "info", message });
  },
};

export function gmailComposeUrl(draft: Draft): string {
  return "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(draft.to) +
    "&su=" + encodeURIComponent(draft.subject) + "&body=" + encodeURIComponent(draft.body);
}

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function safeHref(url: string | null | undefined): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}
