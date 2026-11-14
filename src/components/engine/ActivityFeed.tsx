"use client";

import { cn } from "@/lib/utils";
import { clock, safeHref, type EngineEvent } from "@/lib/engine";

const LEVEL_TONE: Record<EngineEvent["level"], string> = {
  info: "text-muted",
  warn: "text-amber-300",
  error: "text-rose",
  alert: "text-rose font-medium",
};

const STEP_TAG: Record<string, string> = {
  collect: "Collect", analyse: "Analyse", enrich: "Research", verify: "Verify",
  draft: "Draft", send: "Send", worker: "Worker", review: "Review",
};

type SearchResult = { title: string; url: string };

/**
 * Everything the engine and the team did, newest first. Search results that
 * the worker attached to an event can be expanded in place, so "how did it
 * find this?" is answered without leaving the feed.
 */
export function ActivityFeed({
  events,
  onSelectJob,
  showJob = true,
  empty = "No activity yet.",
}: {
  events: EngineEvent[];
  onSelectJob?: (jobKey: string) => void;
  showJob?: boolean;
  empty?: string;
}) {
  if (!events.length) return <p className="p-4 text-sm text-muted">{empty}</p>;
  const dayOf = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
  return (
    <ol className="flex flex-col">
      {events.map((event, index) => {
        const day = dayOf(event.created_at);
        const header = index === 0 || dayOf(events[index - 1].created_at) !== day ? day : null;
        const results = Array.isArray(event.data?.results) ? (event.data.results as SearchResult[]) : [];
        return (
          <li key={event.id}>
            {header && <p className="label sticky top-0 z-[1] bg-surface px-4 pt-3 pb-1">{header}</p>}
            <div className={cn("grid grid-cols-[76px_72px_1fr] gap-2 px-4 py-1.5 text-xs", event.level === "alert" && "bg-rose-soft/40")}>
              <time className="tabular whitespace-nowrap text-muted/70" dateTime={event.created_at}>{clock(event.created_at)}</time>
              <span className="truncate text-muted/80">{STEP_TAG[event.step] ?? event.step}{event.worker_id === "reach" ? " · you" : ""}</span>
              <div className="min-w-0">
                <p className={cn("break-words", LEVEL_TONE[event.level], event.level === "info" && "text-text/85")}>{event.message}</p>
                {showJob && event.job_key && onSelectJob && (
                  <button type="button" onClick={() => onSelectJob(event.job_key!)} className="mt-0.5 text-[11px] text-muted underline-offset-2 hover:text-text hover:underline">
                    open job ~{event.job_key.slice(0, 10)}
                  </button>
                )}
                {results.length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] text-muted hover:text-text">{results.length} search results</summary>
                    <ul className="mt-1 flex flex-col gap-0.5 border-l border-line-soft pl-2">
                      {results.map((result) => (
                        <li key={result.url} className="truncate">
                          <a href={safeHref(result.url)} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-text">
                            {result.title || result.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
