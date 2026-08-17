"use client";

import { useMemo } from "react";
import { useData } from "@/components/DataProvider";
import { ConnectRow } from "@/components/ConnectRow";
import {
  Card,
  EmptyState,
  Page,
  PageHeader,
  SectionHeading,
} from "@/components/ui/layout";
import { Funnel } from "@/components/Funnel";
import { formatShort } from "@/lib/date";
import { diffDays, funnel, rate } from "@/lib/pipeline";

export default function LeadsPage() {
  const { mine, queue, loading } = useData();
  const leads = queue.leads;

  const f = useMemo(() => funnel(mine), [mine]);

  /** How long a connect takes to become a lead - median beats mean on a small n. */
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
      <Page>
        <p className="text-sm text-muted">Loading…</p>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Leads"
        lead="Everyone who turned into real business, and the funnel that got them there."
      />

      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="tabular flex items-baseline gap-2.5">
            <span className="font-display text-[56px] leading-none font-extrabold text-brand sm:text-[68px]">
              {leads.length}
            </span>
            <span className="text-sm text-muted">
              from {f.sent} connect{f.sent === 1 ? "" : "s"}
            </span>
          </div>
          <p className="pb-1.5 text-right text-sm text-muted">
            {f.sent === 0
              ? "Log connects to start the funnel."
              : `${rate(leads.length, f.sent)} of everyone you reached out to.`}
          </p>
        </div>
      </Card>

      {/*
        The funnel is a fixed five rows, so left to itself it would stretch into
        a very wide, very empty band. Capping it in its own column and letting
        the leads take the rest keeps both panels at a readable measure.
      */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
        <section className="lg:sticky lg:top-20">
          <SectionHeading>Funnel</SectionHeading>
          <Funnel
            total={f.sent}
            steps={[
              { label: "Connects sent", value: f.sent, of: f.sent },
              { label: "Accepted", value: f.accepted, of: f.sent },
              { label: "Opener sent", value: f.messaged, of: f.accepted },
              { label: "Replied", value: f.replied, of: f.messaged },
              { label: "Became a lead", value: f.leads, of: f.replied },
            ]}
          />
          {medianDays !== null && (
            <p className="tabular mt-2.5 text-[11px] text-muted/70">
              Typically {medianDays} day{medianDays === 1 ? "" : "s"} from connect
              to lead.
            </p>
          )}
        </section>

        <section>
          <SectionHeading count={leads.length}>Every lead</SectionHeading>

          {leads.length === 0 ? (
            <EmptyState title="No leads yet.">
              When a reply turns into real interest, mark them as a lead from the
              queue and they&apos;ll collect here.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {leads.map((connect, i) => (
                <li key={connect.id} className="flex flex-col">
                  {connect.lead_on && (
                    <span className="label tabular mb-1 pl-1 text-brand/70">
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
    </Page>
  );
}
