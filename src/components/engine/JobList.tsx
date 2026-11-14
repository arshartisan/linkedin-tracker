"use client";

import { cn } from "@/lib/utils";
import { ENGINE_STEPS, ago, stepDone, type EngineJobSummary } from "@/lib/engine";

export type JobFilter = "review" | "progress" | "ready" | "sent" | "skipped" | "all";

export const JOB_FILTERS: { value: JobFilter; label: string }[] = [
  { value: "ready", label: "Ready" },
  { value: "review", label: "Review" },
  { value: "progress", label: "Running" },
  { value: "sent", label: "Sent" },
  { value: "skipped", label: "Skipped" },
  { value: "all", label: "All" },
];

export function matchesFilter(job: EngineJobSummary, filter: JobFilter): boolean {
  if (filter === "all") return true;
  if (filter === "skipped") return job.skipped;
  if (job.skipped) return false;
  if (filter === "sent") return job.stage === "sent";
  if (filter === "ready") return job.stage === "drafted" && !job.error && !job.running_step && !job.requested_step;
  if (filter === "review") return Boolean(job.error || job.hold_reason);
  return job.stage !== "drafted" && job.stage !== "sent" && !job.error && !job.hold_reason;
}

function Dots({ job }: { job: EngineJobSummary }) {
  const failed = job.error ? job.error.split(":")[0] : null;
  return (
    <span className="flex items-center gap-1" aria-label={`Stage: ${job.stage}`}>
      {(["collect", ...ENGINE_STEPS] as const).map((step) => {
        const done = stepDone(job.stage, step);
        const running = job.running_step === step || (step !== "collect" && job.requested_step === step);
        return (
          <span
            key={step}
            title={step}
            className={cn(
              "size-2 rounded-full bg-line",
              done && "bg-brand",
              running && "animate-pulse bg-sky-300",
              !done && failed === step && "bg-rose",
            )}
          />
        );
      })}
    </span>
  );
}

function StatusText({ job }: { job: EngineJobSummary }) {
  if (job.skipped) return <span className="text-muted">{job.duplicate_note ? "Already in pipeline" : "Skipped"}</span>;
  if (job.running_step) return <span className="text-sky-300">Running {job.running_step}…</span>;
  if (job.requested_step) return <span className="text-sky-300">Queued: {job.requested_step}</span>;
  if (job.error) return <span className="text-rose">Failed at {job.error.split(":")[0]}</span>;
  if (job.hold_reason) return <span className="text-amber-300">Needs review</span>;
  if (job.stage === "sent") return <span className="text-brand">Sent {ago(job.sent_at)}</span>;
  if (job.stage === "drafted") return <span className="text-text">Ready to send</span>;
  return <span className="text-muted">Waiting for {job.stage === "collected" ? "analysis" : "next step"}</span>;
}

export function JobList({
  jobs,
  selectedId,
  onSelect,
}: {
  jobs: EngineJobSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col">
      {jobs.map((job) => {
        const who = [job.founder || job.client_name, job.company, job.country].filter(Boolean).join(" · ");
        return (
          <li key={job.id}>
            <button
              type="button"
              onClick={() => onSelect(job.id)}
              aria-current={job.id === selectedId ? "true" : undefined}
              className={cn(
                "flex w-full flex-col gap-1 border-b border-line-soft px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-2/60",
                job.id === selectedId && "bg-surface-2",
              )}
            >
              <span className="truncate text-[13px] font-medium">{job.title || "(untitled job)"}</span>
              <span className="truncate text-xs text-muted">{who || "Not analysed yet"}{job.spent ? ` · ${job.spent} spent` : ""}</span>
              <span className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                <Dots job={job} />
                <StatusText job={job} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
