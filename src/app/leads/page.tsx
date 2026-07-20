"use client";

import { useMemo } from "react";
import { useData } from "@/components/DataProvider";
import { ConnectRow } from "@/components/ConnectRow";
import { formatShort } from "@/lib/date";
import { diffDays, funnel, rate } from "@/lib/pipeline";

export default function LeadsPage() {
  const { connects, queue, loading } = useData();
  const leads = queue.leads;

  const f = useMemo(() => funnel(connects), [connects]);

  /** How long a connect takes to become a lead — median beats mean on a small n. */
  const medianDays = useMemo(() => {
    const spans = leads
      .filter((l) => l.lead_on)
      .map((l) => diffDays(l.sent_on, l.lead_on!))
      .sort((a, b) => a - b);
    if (spans.length === 0) return null;
    return spans[Math.floor(spans.length / 2)];
  }, [leads]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Leads</h1>
        <div className="mt-4 flex items-end justify-between gap-6">
          <div className="tabular flex items-baseline gap-2">
            <span className="font-display text-[64px] font-extrabold leading-none tracking-tight text-teal sm:text-[76px]">
              {leads.length}
            </span>
            <span className="font-mono text-sm text-muted">
              from {f.sent} connect{f.sent === 1 ? "" : "s"}
            </span>
          </div>
          <p className="pb-2 text-right text-sm text-muted">
            {f.sent === 0
              ? "Log connects to start the funnel."
              : `${rate(leads.length, f.sent)} of everyone you reached out to.`}
          </p>
        </div>
      </header>

      <section className="mb-9">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Funnel
        </h2>
        <div className="overflow-hidden rounded-2xl border border-line-soft bg-surface">
          {(
            [
              { label: "Connects sent", value: f.sent, of: f.sent },
              { label: "Accepted", value: f.accepted, of: f.sent },
              { label: "Opener sent", value: f.messaged, of: f.accepted },
              { label: "Replied", value: f.replied, of: f.messaged },
              { label: "Became a lead", value: f.leads, of: f.replied },
            ] as const
          ).map((step, i) => {
            const width = f.sent === 0 ? 0 : (step.value / f.sent) * 100;
            const last = i === 4;
            return (
              <div
                key={step.label}
                className="relative border-b border-line-soft px-4 py-3 last:border-b-0"
              >
                <div
                  className={`absolute inset-y-0 left-0 ${last ? "bg-teal/15" : "bg-amber/10"}`}
                  style={{ width: `${Math.max(width, step.value > 0 ? 2 : 0)}%` }}
                  aria-hidden
                />
                <div className="relative flex items-baseline justify-between gap-4">
                  <span className="text-sm">{step.label}</span>
                  <span className="tabular flex items-baseline gap-2 font-mono text-xs">
                    <span className={last ? "text-teal" : "text-text"}>
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
            Typically {medianDays} day{medianDays === 1 ? "" : "s"} from connect to
            lead.
          </p>
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
              When a reply turns into real interest, mark them as a lead from the
              queue and they&apos;ll collect here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {leads.map((connect, i) => (
              <li key={connect.id} className="flex flex-col">
                {connect.lead_on && (
                  <span className="tabular mb-1 pl-1 font-mono text-[10px] uppercase tracking-wide text-teal/70">
                    lead since {formatShort(connect.lead_on)}
                  </span>
                )}
                <ul>
                  <ConnectRow connect={connect} index={i} />
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
