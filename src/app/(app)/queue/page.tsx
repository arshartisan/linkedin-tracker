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
import {
  Card,
  Chip,
  EmptyState,
  Page,
  PageHeader,
  SectionHeading,
  Well,
} from "@/components/ui/layout";
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
      <Page>
        <ul className="grid gap-2 xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-[76px] animate-pulse rounded-well bg-surface" />
          ))}
        </ul>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Queue"
        lead="Everything waiting on a message from you, most overdue first."
        actions={late > 0 ? <Chip tone="rose">{late} overdue</Chip> : null}
      />

      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="tabular flex items-baseline gap-2.5">
            <span
              className={`font-display text-[56px] leading-none font-extrabold sm:text-[68px] ${
                dueCount === 0 ? "text-brand" : "text-text"
              }`}
            >
              {dueCount}
            </span>
            <span className="text-sm text-muted">to action</span>
          </div>

          {/*
            The three lanes as a strip: what the number above is actually made
            of, without having to scroll to find out.
          */}
          <div className="flex flex-wrap gap-2">
            {GROUPS.map(({ kind, title }) => {
              const n = byKind.get(kind)?.length ?? 0;
              return (
                <Well key={kind} className="min-w-[104px] px-3.5 py-2.5">
                  <div
                    className={`tabular font-display text-xl leading-none font-extrabold ${
                      n > 0 ? "text-text" : "text-muted/40"
                    }`}
                  >
                    {n}
                  </div>
                  <div className="mt-1 text-[11px] text-muted">{title}</div>
                </Well>
              );
            })}
          </div>
        </div>
      </Card>

      {dueCount === 0 ? (
        <EmptyState title={<span className="text-brand">Queue is clear.</span>}>
          Nothing needs a message today. Go log some new connects - the pipeline
          only fills from the top.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-8">
          {GROUPS.map(({ kind, title, blurb }) => {
            const items = byKind.get(kind);
            if (!items?.length) return null;
            return (
              <section key={kind}>
                <SectionHeading count={items.length} hint={blurb}>
                  {title}
                </SectionHeading>
                <ul className="grid gap-2 xl:grid-cols-2">
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
          <SectionHeading
            count={stale.length}
            hint="Both follow-ups sent, no reply. Close them so the queue stays honest."
          >
            Went quiet
          </SectionHeading>
          <ul className="grid gap-2 xl:grid-cols-2">
            {stale.map((connect, i) => (
              <ConnectRow key={connect.id} connect={connect} index={i} />
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mt-10">
          <SectionHeading count={upcoming.length}>Coming up</SectionHeading>
          <Card className="p-2">
            <ul className="flex flex-col gap-1">
              {upcoming.slice(0, 8).map(({ connect, action }) => (
                <Well
                  as="li"
                  key={connect.id}
                  className="flex items-center gap-3 px-3.5 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {connect.name || "Unnamed"}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{action.label}</span>
                  <span className="tabular shrink-0 text-[11px] text-muted/70">
                    {formatShort(action.dueOn)}
                  </span>
                </Well>
              ))}
            </ul>
          </Card>
          {upcoming.length > 8 && (
            <p className="tabular mt-2 text-[11px] text-muted/60">
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
                  className="mt-0.5 size-3.5 shrink-0 text-muted transition-transform group-data-[state=open]/waiting:rotate-90"
                  aria-hidden
                />
                <SectionHeading count={waiting.length}>
                  Waiting on accept
                </SectionHeading>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="grid gap-2 xl:grid-cols-2">
                {waiting.map((connect, i) => (
                  <ConnectRow key={connect.id} connect={connect} index={i} />
                ))}
              </ul>
            </CollapsibleContent>
          </section>
        </Collapsible>
      )}
    </Page>
  );
}
