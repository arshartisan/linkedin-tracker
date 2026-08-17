"use client";

import { useBiz } from "@/components/BizProvider";
import { BizRow } from "@/components/BizRow";
import {
  Card,
  EmptyState,
  Page,
  PageHeader,
  SectionHeading,
  Well,
} from "@/components/ui/layout";
import { MAX_BIZ_FOLLOWUPS } from "@/lib/biz-pipeline";
import { formatShort } from "@/lib/date";

/**
 * What to do now, in two lanes.
 *
 * Research and messaging are the same pipeline but not the same activity:
 * digging numbers out of ten websites is one sitting, and writing ten WhatsApp
 * messages is another. Interleaving them in one list means doing neither well,
 * so the lanes stay apart and each one is finishable on its own.
 */
export default function LocalQueuePage() {
  const { queue, loading } = useBiz();

  if (loading) {
    return (
      <Page>
        <p className="text-sm text-muted">Loading…</p>
      </Page>
    );
  }

  const nothing =
    queue.research.length === 0 &&
    queue.due.length === 0 &&
    queue.upcoming.length === 0 &&
    queue.stale.length === 0 &&
    queue.unreachable.length === 0;

  return (
    <Page>
      <PageHeader
        title="Local queue"
        lead="Research on the left of the day, messaging on the right of it."
      />

      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="tabular flex items-baseline gap-2.5">
            <span className="font-display text-[56px] leading-none font-extrabold text-brand sm:text-[68px]">
              {queue.research.length + queue.due.length}
            </span>
            <span className="text-sm text-muted">to do now</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Well className="min-w-[104px] px-3.5 py-2.5">
              <div
                className={`tabular font-display text-xl leading-none font-extrabold ${
                  queue.research.length > 0 ? "text-text" : "text-muted/40"
                }`}
              >
                {queue.research.length}
              </div>
              <div className="mt-1 text-[11px] text-muted">To research</div>
            </Well>
            <Well className="min-w-[104px] px-3.5 py-2.5">
              <div
                className={`tabular font-display text-xl leading-none font-extrabold ${
                  queue.due.length > 0 ? "text-text" : "text-muted/40"
                }`}
              >
                {queue.due.length}
              </div>
              <div className="mt-1 text-[11px] text-muted">To message</div>
            </Well>
            {queue.upcoming.length > 0 && (
              <Well className="min-w-[104px] px-3.5 py-2.5">
                <div className="tabular font-display text-xl leading-none font-extrabold text-muted/70">
                  {queue.upcoming.length}
                </div>
                <div className="mt-1 text-[11px] text-muted">Coming up</div>
              </Well>
            )}
          </div>
        </div>
      </Card>

      {nothing && (
        <EmptyState title="Queue's clear.">
          Nothing waiting. Head to Prospect and sweep another search.
        </EmptyState>
      )}

      <div className="flex flex-col gap-9">
        <Lane
          title="Research"
          count={queue.research.length}
          hint="Open their site and Facebook, dig out a WhatsApp number."
        >
          {queue.research.map((business, i) => (
            <BizRow key={business.id} business={business} index={i} />
          ))}
        </Lane>

        <Lane
          title="Message"
          count={queue.due.length}
          hint="Openers, follow-ups and replies that are due."
        >
          {queue.due.map(({ business, action }, i) => (
            <BizRow key={business.id} business={business} action={action} index={i} />
          ))}
        </Lane>

        {queue.upcoming.length > 0 && (
          <section>
            <SectionHeading count={queue.upcoming.length}>Coming up</SectionHeading>
            <Card className="p-2">
              <ul className="flex flex-col gap-1">
                {queue.upcoming.map(({ business, action }, i) => (
                  <Well
                    as="li"
                    key={business.id}
                    className="row-in flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
                    style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {business.name}
                    </span>
                    <span className="text-xs text-muted">{action.label}</span>
                    <span className="tabular text-[10px] font-bold tracking-wide text-muted/70 uppercase">
                      {formatShort(action.dueOn)}
                    </span>
                  </Well>
                ))}
              </ul>
            </Card>
          </section>
        )}

        <Lane
          title="Gone quiet"
          count={queue.stale.length}
          hint={`No reply after ${MAX_BIZ_FOLLOWUPS} follow-ups.`}
        >
          {queue.stale.map((business, i) => (
            <BizRow key={business.id} business={business} index={i} />
          ))}
        </Lane>

        <Lane
          title="No contact found"
          count={queue.unreachable.length}
          hint="Parked, not deleted - a number can turn up later."
        >
          {queue.unreachable.map((business, i) => (
            <BizRow key={business.id} business={business} index={i} showAction={false} />
          ))}
        </Lane>
      </div>
    </Page>
  );
}

function Lane({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <SectionHeading count={count} hint={hint}>
        {title}
      </SectionHeading>
      <ul className="grid gap-2.5">{children}</ul>
    </section>
  );
}
