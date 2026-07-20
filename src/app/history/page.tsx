"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { ConnectRow } from "@/components/ConnectRow";
import { Tally } from "@/components/Tally";
import { formatLong, relativeDay } from "@/lib/date";
import { STATUSES, STATUS_LABEL, type ConnectStatus } from "@/lib/types";

type Filter = "all" | ConnectStatus;

export default function HistoryPage() {
  const { connects, goal, loading } = useData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return connects.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.profile_url.toLowerCase().includes(q) ||
        c.note.toLowerCase().includes(q) ||
        c.tags.some((t) => t.includes(q))
      );
    });
  }, [connects, query, filter]);

  const days = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const list = map.get(c.sent_on);
      if (list) list.push(c);
      else map.set(c.sent_on, [c]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          History
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every connect you&apos;ve logged, newest first. Search before you send
          to avoid doubling up.
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-5 mb-5 bg-ink/90 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, link, note or tag"
            aria-label="Search connects"
            className="flex-1 rounded-xl border border-line-soft bg-surface px-4 py-2.5 text-sm placeholder:text-muted/70 focus:border-amber focus:outline-none"
          />
          <div className="flex rounded-xl border border-line-soft bg-surface p-0.5">
            {(["all", ...STATUSES] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`flex-1 rounded-[10px] px-3 py-2 text-[11px] font-medium transition-colors ${
                  filter === f
                    ? "bg-surface-2 text-text"
                    : "text-muted hover:text-text"
                }`}
              >
                {f === "all" ? "All" : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-lg font-semibold">
            {connects.length === 0 ? "No connects logged yet." : "No matches."}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            {connects.length === 0
              ? "Log your first one on the Today screen."
              : "Try a different name, tag or status."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {days.map(([day, rows]) => (
            <section key={day}>
              <div className="mb-3 flex items-center gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-sm font-bold">
                    {relativeDay(day) ?? formatLong(day)}
                  </h2>
                  <p className="tabular font-mono text-[11px] text-muted">
                    {rows.length} of {goal}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <Tally count={rows.length} goal={goal} compact />
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {rows.map((connect, i) => (
                  <ConnectRow key={connect.id} connect={connect} index={i} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
