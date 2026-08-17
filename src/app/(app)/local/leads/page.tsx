"use client";

import { useMemo } from "react";
import { useBiz } from "@/components/BizProvider";
import { BizRow } from "@/components/BizRow";
import { formatShort } from "@/lib/date";
import { bizFunnel, rate } from "@/lib/biz-pipeline";
import { diffDays } from "@/lib/pipeline";
import { categoryLabel } from "@/lib/biz";

/**
 * What the sweep actually paid out, and the funnel that says which step is
 * losing people. Same shape as the LinkedIn leads screen - the two sections
 * should be readable by the same pair of eyes on the same morning.
 */
export default function LocalLeadsPage() {
  const { mine, queue, cityById, loading } = useBiz();
  const leads = queue.leads;

  const f = useMemo(() => bizFunnel(mine), [mine]);

  /** How long a business takes to become a lead - median beats mean on a small n. */
  const medianDays = useMemo(() => {
    const spans = leads
      .filter((l) => l.lead_on)
      .map((l) => diffDays(l.found_on, l.lead_on!))
      .sort((a, b) => a - b);
    if (spans.length === 0) return null;
    return spans[Math.floor(spans.length / 2)];
  }, [leads]);

  /**
   * Which trades convert. With sixteen categories and a small sample this is
   * noisy for a while, so it only appears once there is something to compare -
   * a table of 1-out-of-1s would read as a finding when it is a coincidence.
   */
  const byCategory = useMemo(() => {
    const totals = new Map<string, { total: number; leads: number }>();
    for (const b of mine) {
      const row = totals.get(b.category) ?? { total: 0, leads: 0 };
      row.total += 1;
      if (b.stage === "lead") row.leads += 1;
      totals.set(b.category, row);
    }
    return [...totals.entries()]
      .filter(([, v]) => v.total >= 3)
      .sort((a, b) => b[1].leads / b[1].total - a[1].leads / a[1].total)
      .slice(0, 6);
  }, [mine]);

  if (loading) {
    return (
      <div className="px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Local leads
        </h1>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="tabular flex items-baseline gap-2">
            <span className="font-display text-[64px] font-extrabold leading-none tracking-tight text-brand sm:text-[76px]">
              {leads.length}
            </span>
            <span className="font-mono text-sm text-muted">
              from {f.found} business{f.found === 1 ? "" : "es"}
            </span>
          </div>
          <p className="pb-2 text-right text-sm text-muted">
            {f.found === 0
              ? "Sweep a search to start the funnel."
              : `${rate(leads.length, f.found)} of everyone you found.`}
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <section className="lg:sticky lg:top-8">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Funnel
          </h2>
          <div className="overflow-hidden rounded-2xl border border-line-soft bg-surface">
            {(
              [
                { label: "Found", value: f.found, of: f.found },
                { label: "Number found", value: f.researched, of: f.found },
                { label: "Messaged", value: f.contacted, of: f.researched },
                { label: "Replied", value: f.replied, of: f.contacted },
                { label: "Became a lead", value: f.leads, of: f.replied },
              ] as const
            ).map((step, i) => {
              const width = f.found === 0 ? 0 : (step.value / f.found) * 100;
              const last = i === 4;
              return (
                <div
                  key={step.label}
                  className="relative border-b border-line-soft px-4 py-3 last:border-b-0"
                >
                  <div
                    /* The last row is the one that pays - it gets the only fill
                       with any real weight to it. */
                    className={`absolute inset-y-0 left-0 ${last ? "bg-brand/25" : "bg-brand/8"}`}
                    style={{ width: `${Math.max(width, step.value > 0 ? 2 : 0)}%` }}
                    aria-hidden
                  />
                  <div className="relative flex items-baseline justify-between gap-4">
                    <span className="text-sm">{step.label}</span>
                    <span className="tabular flex items-baseline gap-2 font-mono text-xs">
                      <span className={last ? "text-brand" : "text-text"}>
                        {step.value}
                      </span>
                      {i > 0 && (
                        <span className="text-muted/70">
                          {rate(step.value, step.of)} of prev
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {medianDays !== null && (
            <p className="tabular mt-2 font-mono text-[11px] text-muted/70">
              Typically {medianDays} day{medianDays === 1 ? "" : "s"} from found to lead.
            </p>
          )}

          {queue.unreachable.length > 0 && (
            <p className="tabular mt-1 font-mono text-[11px] text-muted/70">
              {queue.unreachable.length} with no contact anywhere.
            </p>
          )}

          {byCategory.length > 1 && (
            <>
              <h2 className="mt-7 mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                By trade
              </h2>
              <div className="overflow-hidden rounded-2xl border border-line-soft bg-surface">
                {byCategory.map(([id, v]) => (
                  <div
                    key={id}
                    className="flex items-baseline justify-between gap-4 border-b border-line-soft px-4 py-2.5 last:border-b-0"
                  >
                    <span className="truncate text-sm">{categoryLabel(id)}</span>
                    <span className="tabular shrink-0 font-mono text-xs">
                      <span className={v.leads > 0 ? "text-brand" : "text-muted"}>
                        {v.leads}
                      </span>
                      <span className="text-muted/60">/{v.total}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Every lead
            {leads.length > 0 && (
              <span className="tabular text-muted/60">{leads.length}</span>
            )}
          </h2>

          {leads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
              <p className="font-display text-lg font-semibold">No leads yet.</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
                When a WhatsApp reply turns into real interest, mark them as a lead
                from the queue and they&apos;ll collect here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {leads.map((business, i) => {
                const city = cityById(business.city);
                return (
                  <li key={business.id} className="flex flex-col">
                    <span className="tabular mb-1 pl-1 font-mono text-[10px] uppercase tracking-wide text-brand/70">
                      {categoryLabel(business.category)} · {city?.name ?? business.city}
                      {business.lead_on && ` · lead since ${formatShort(business.lead_on)}`}
                    </span>
                    <ul>
                      <BizRow business={business} index={i} showAction={false} />
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
