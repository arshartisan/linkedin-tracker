"use client";

import { useBiz } from "@/components/BizProvider";
import { BizRow } from "@/components/BizRow";
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
      <div className="px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  const nothing =
    queue.research.length === 0 &&
    queue.due.length === 0 &&
    queue.upcoming.length === 0 &&
    queue.stale.length === 0 &&
    queue.unreachable.length === 0;

  return (
    <div className="px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Local queue
        </h1>
        <div className="tabular mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <span className="flex items-baseline gap-2">
            <span className="font-display text-[52px] font-extrabold leading-none tracking-tight text-brand">
              {queue.research.length + queue.due.length}
            </span>
            <span className="font-mono text-sm text-muted">to do now</span>
          </span>
          {queue.upcoming.length > 0 && (
            <span className="font-mono text-xs text-muted/70">
              {queue.upcoming.length} coming up
            </span>
          )}
        </div>
      </header>

      {nothing && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold">Queue&apos;s clear.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            Nothing waiting. Head to Prospect and sweep another search.
          </p>
        </div>
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
          <Lane title="Coming up" count={queue.upcoming.length}>
            {queue.upcoming.map(({ business, action }, i) => (
              <li
                key={business.id}
                className="row-in flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line-soft bg-surface/50 px-4 py-3"
                style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }}
              >
                <span className="min-w-0 flex-1 truncate text-sm">{business.name}</span>
                <span className="text-xs text-muted">{action.label}</span>
                <span className="tabular font-mono text-[10px] uppercase tracking-wide text-muted/70">
                  {formatShort(action.dueOn)}
                </span>
              </li>
            ))}
          </Lane>
        )}

        {queue.stale.length > 0 && (
          <Lane
            title="Gone quiet"
            count={queue.stale.length}
            hint={`No reply after ${MAX_BIZ_FOLLOWUPS} follow-ups.`}
          >
            {queue.stale.map((business, i) => (
              <BizRow key={business.id} business={business} index={i} />
            ))}
          </Lane>
        )}

        {queue.unreachable.length > 0 && (
          <Lane
            title="No contact found"
            count={queue.unreachable.length}
            hint="Parked, not deleted - a number can turn up later."
          >
            {queue.unreachable.map((business, i) => (
              <BizRow key={business.id} business={business} index={i} showAction={false} />
            ))}
          </Lane>
        )}
      </div>
    </div>
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
      <h2 className="mb-1 flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        {title}
        <span className="tabular text-muted/60">{count}</span>
      </h2>
      {hint && <p className="mb-3 text-xs text-muted/70">{hint}</p>}
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}
