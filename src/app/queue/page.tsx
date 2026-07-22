"use client";

import { useMemo, useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { ConnectRow } from "@/components/ConnectRow";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatShort } from "@/lib/date";
import type { ActionKind, Queue } from "@/lib/pipeline";

const GROUPS: { kind: ActionKind; title: string; blurb: string }[] = [
  {
    kind: "qualify",
    title: "Replies waiting",
    blurb: "They wrote back. Answer, then call it: lead or not a fit.",
  },
  {
    kind: "pitch",
    title: "Send the opener",
    blurb: "Accepted your invite. Lead with what you can do for them.",
  },
  {
    kind: "followup",
    title: "Follow up",
    blurb: "Gone quiet since your last message. Two nudges, then let it go.",
  },
];

function Heading({ title, count, blurb }: { title: string; count: number; blurb?: string }) {
  return (
    <div className="mb-3">
      <h2 className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        {title}
        <span className="tabular text-muted/60">{count}</span>
      </h2>
      {blurb && <p className="mt-1 text-xs text-muted/70">{blurb}</p>}
    </div>
  );
}

export default function QueuePage() {
  const { queue, loading } = useData();
  const { due, upcoming, waiting, stale } = queue;
  const [showWaiting, setShowWaiting] = useState(false);

  const byKind = useMemo(() => {
    const map = new Map<ActionKind, Queue["due"]>();
    for (const item of due) {
      const list = map.get(item.action.kind);
      if (list) list.push(item);
      else map.set(item.action.kind, [item]);
    }
    return map;
  }, [due]);

  const dueCount = due.length;
  const late = due.filter((d) => d.action.overdue > 0).length;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <ul className="grid gap-2 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-17.5 animate-pulse rounded-xl border border-line-soft bg-surface"
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Queue</h1>
        <div className="mt-4 flex items-end justify-between gap-6">
          <div className="tabular flex items-baseline gap-2">
            <span
              className={`font-display text-[64px] font-extrabold leading-none tracking-tight sm:text-[76px] ${
                dueCount === 0 ? "text-teal" : "text-text"
              }`}
            >
              {dueCount}
            </span>
            <span className="font-mono text-sm text-muted">to action</span>
          </div>
          {late > 0 && (
            <p className="tabular pb-2 text-right font-mono text-[11px] uppercase tracking-[0.14em] text-rose">
              {late} overdue
            </p>
          )}
        </div>
      </header>

      {dueCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold text-teal">
            Queue is clear.
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            Nothing needs a message today. Go log some new connects — the
            pipeline only fills from the top.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {GROUPS.map(({ kind, title, blurb }) => {
            const items = byKind.get(kind);
            if (!items?.length) return null;
            return (
              <section key={kind}>
                <Heading title={title} count={items.length} blurb={blurb} />
                <ul className="grid gap-2 lg:grid-cols-2">
                  {items.map(({ connect, action }, i) => (
                    <ConnectRow
                      key={connect.id}
                      connect={connect}
                      action={action}
                      index={i}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {stale.length > 0 && (
        <section className="mt-10">
          <Heading
            title="Went quiet"
            count={stale.length}
            blurb="Both follow-ups sent, no reply. Close them so the queue stays honest."
          />
          <ul className="grid gap-2 lg:grid-cols-2">
            {stale.map((connect, i) => (
              <ConnectRow key={connect.id} connect={connect} index={i} />
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mt-10">
          <Heading title="Coming up" count={upcoming.length} />
          <ul className="grid gap-1.5 lg:grid-cols-2">
            {upcoming.slice(0, 8).map(({ connect, action }) => (
              <li
                key={connect.id}
                className="flex items-center gap-3 rounded-lg border border-line-soft bg-surface px-3.5 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {connect.name || "Unnamed"}
                </span>
                <span className="shrink-0 text-xs text-muted">{action.label}</span>
                <span className="tabular shrink-0 font-mono text-[11px] text-muted/70">
                  {formatShort(action.dueOn)}
                </span>
              </li>
            ))}
          </ul>
          {upcoming.length > 8 && (
            <p className="tabular mt-2 font-mono text-[11px] text-muted/60">
              +{upcoming.length - 8} more
            </p>
          )}
        </section>
      )}

      {waiting.length > 0 && (
        <Collapsible
          open={showWaiting}
          onOpenChange={setShowWaiting}
          className="group/waiting mt-10"
          asChild
        >
          <section>
            <CollapsibleTrigger className="w-full text-left outline-none">
              <div className="flex items-start gap-2">
                <ChevronRightIcon
                  className="mt-px size-3.5 shrink-0 text-muted transition-transform group-data-[state=open]/waiting:rotate-90"
                  aria-hidden
                />
                <Heading title="Waiting on accept" count={waiting.length} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="grid gap-2 lg:grid-cols-2">
                {waiting.map((connect, i) => (
                  <ConnectRow key={connect.id} connect={connect} index={i} />
                ))}
              </ul>
            </CollapsibleContent>
          </section>
        </Collapsible>
      )}
    </div>
  );
}
