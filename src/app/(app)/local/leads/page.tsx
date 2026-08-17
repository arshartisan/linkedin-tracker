"use client";

import { useMemo } from "react";
import { useBiz } from "@/components/BizProvider";
import { BizRow } from "@/components/BizRow";
import { Funnel } from "@/components/Funnel";
import {
  Card,
  EmptyState,
  Page,
  PageHeader,
  SectionHeading,
  Well,
} from "@/components/ui/layout";
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
      <Page>
        <p className="text-sm text-muted">Loading…</p>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Local leads"
        lead="What the sweep paid out, and which step is losing the rest."
      />

      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="tabular flex items-baseline gap-2.5">
            <span className="font-display text-[56px] leading-none font-extrabold text-brand sm:text-[68px]">
              {leads.length}
            </span>
            <span className="text-sm text-muted">
              from {f.found} business{f.found === 1 ? "" : "es"}
            </span>
          </div>
          <p className="pb-1.5 text-right text-sm text-muted">
            {f.found === 0
              ? "Sweep a search to start the funnel."
              : `${rate(leads.length, f.found)} of everyone you found.`}
          </p>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
        <section className="lg:sticky lg:top-20">
          <SectionHeading>Funnel</SectionHeading>
          <Funnel
            total={f.found}
            steps={[
              { label: "Found", value: f.found, of: f.found },
              { label: "Number found", value: f.researched, of: f.found },
              { label: "Messaged", value: f.contacted, of: f.researched },
              { label: "Replied", value: f.replied, of: f.contacted },
              { label: "Became a lead", value: f.leads, of: f.replied },
            ]}
          />

          {medianDays !== null && (
            <p className="tabular mt-2.5 text-[11px] text-muted/70">
              Typically {medianDays} day{medianDays === 1 ? "" : "s"} from found to
              lead.
            </p>
          )}

          {queue.unreachable.length > 0 && (
            <p className="tabular mt-1 text-[11px] text-muted/70">
              {queue.unreachable.length} with no contact anywhere.
            </p>
          )}

          {byCategory.length > 1 && (
            <>
              <SectionHeading className="mt-7">By trade</SectionHeading>
              <Card className="p-2">
                <div className="flex flex-col gap-1">
                  {byCategory.map(([id, v]) => (
                    <Well
                      key={id}
                      className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                    >
                      <span className="truncate text-[13px] font-medium">
                        {categoryLabel(id)}
                      </span>
                      <span className="tabular shrink-0 text-xs">
                        <span
                          className={
                            v.leads > 0 ? "font-bold text-brand" : "text-muted"
                          }
                        >
                          {v.leads}
                        </span>
                        <span className="text-muted/60">/{v.total}</span>
                      </span>
                    </Well>
                  ))}
                </div>
              </Card>
            </>
          )}
        </section>

        <section>
          <SectionHeading count={leads.length}>Every lead</SectionHeading>

          {leads.length === 0 ? (
            <EmptyState title="No leads yet.">
              When a WhatsApp reply turns into real interest, mark them as a lead
              from the queue and they&apos;ll collect here.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {leads.map((business, i) => {
                const city = cityById(business.city);
                return (
                  <li key={business.id} className="flex flex-col">
                    <span className="label tabular mb-1 pl-1 text-brand/70">
                      {categoryLabel(business.category)} ·{" "}
                      {city?.name ?? business.city}
                      {business.lead_on &&
                        ` · lead since ${formatShort(business.lead_on)}`}
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
    </Page>
  );
}
