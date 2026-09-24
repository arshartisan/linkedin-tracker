"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Heatmap, heatmapStart } from "@/components/Heatmap";
import { TrendChart } from "@/components/TrendChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  Delta,
  Label,
  Page,
  PageHeader,
  Segmented,
  Well,
} from "@/components/ui/layout";
import { dayKey, formatShort, shiftDayKey, weekStart } from "@/lib/date";
import { diffDays, funnel } from "@/lib/pipeline";
import { USER_IDS, USER_LABEL, type UserId } from "@/lib/types";
import {
  acceptanceRate,
  averagePerActiveDay,
  bestDay,
  bestStreak,
  countsByDay,
  currentStreak,
  periodDelta,
  replyRate,
  sumSince,
  totalsThisMonth,
  totalsThisWeek,
} from "@/lib/stats";

/** Kept beside the caption below, which has to name the same window. */
const HEATMAP_WEEKS = 26;

const RANGES = [
  { days: 14, label: "14d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
] as const;

/** "all" is the team; the rest are the three of us. */
type Owner = UserId | "all";

const OWNERS: { value: Owner; label: string }[] = [
  { value: "all", label: "All" },
  ...USER_IDS.map((id) => ({ value: id as Owner, label: USER_LABEL[id] })),
];

type Tone = "text" | "brand" | "dim";

const TONE: Record<Tone, string> = {
  text: "text-text",
  brand: "text-brand",
  dim: "text-brand-dim",
};

/**
 * A tile in the stat grid. Label above the figure here, not below it as the
 * shared `Stat` has it: these come eight at a time in a uniform grid, and a
 * reader scanning for "accept rate" needs the name to be the thing on the
 * gridline. The shared one is for figures you meet singly.
 */
function Stat({
  label,
  value,
  detail,
  tone = "text",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: Tone;
}) {
  return (
    <Card className="px-4 py-3.5">
      <Label>{label}</Label>
      <div className={`tabular mt-1.5 font-display text-2xl font-semibold ${TONE[tone]}`}>
        {value}
      </div>
      {detail && <div className="mt-0.5 text-xs text-muted">{detail}</div>}
    </Card>
  );
}

function Th({
  children,
  className = "text-right",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`label pb-2 font-semibold ${className}`}
    >
      {children}
    </th>
  );
}

/** A number and, under it, the denominator that makes it mean something. */
function Td({
  value,
  detail,
  tone = "text",
}: {
  value: string;
  detail?: string;
  tone?: Tone;
}) {
  return (
    <td className="tabular py-3 text-right">
      <div className={`font-semibold ${TONE[tone]}`}>{value}</div>
      {detail && <div className="mt-0.5 text-[11px] text-muted">{detail}</div>}
    </td>
  );
}

function StatsSkeleton() {
  return (
    <Page>
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mt-2 h-4 w-64" />
      <Skeleton className="mt-7 h-[26rem] w-full rounded-card" />
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-card" />
        ))}
      </div>
    </Page>
  );
}

export default function StatsPage() {
  const { connects, goals, me, loading } = useData();
  const [range, setRange] = useState<number>(14);
  const [owner, setOwner] = useState<Owner>("all");

  /*
    Every metric on this page is a pure function of a Connect[], so filtering
    once here is the whole of the per-person view - stats.ts and pipeline.ts
    don't need to know anyone exists.
  */
  const scoped = useMemo(
    () => (owner === "all" ? connects : connects.filter((c) => c.owner === owner)),
    [connects, owner]
  );

  /*
    A team day is on target when all three have hit theirs, so the combined
    target is the sum. Anything else would make the team line trivially green.
  */
  const goal =
    owner === "all"
      ? USER_IDS.reduce((sum, id) => sum + (goals[id] ?? 0), 0)
      : goals[owner];

  const counts = useMemo(() => countsByDay(scoped), [scoped]);
  const today = dayKey();

  const streak = currentStreak(counts, goal);
  const best = bestStreak(counts, goal);
  const week = totalsThisWeek(counts);
  const month = totalsThisMonth(counts);
  const last30 = sumSince(counts, shiftDayKey(today, -29));
  const average = averagePerActiveDay(counts);
  const peak = bestDay(counts);
  const { rate, decided } = acceptanceRate(scoped);
  const { rate: replies, pitched } = replyRate(scoped);

  const daysThisWeek = diffDays(weekStart(today), today) + 1;
  const weekTarget = goal * daysThisWeek;

  const period = useMemo(() => periodDelta(counts, range), [counts, range]);

  // Left to the React Compiler rather than a useMemo - `today` isn't provably
  // stable to it, so a manual dependency list here only defeats optimisation.
  const points: { day: string; count: number }[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const day = shiftDayKey(today, -i);
    points.push({ day, count: counts.get(day) ?? 0 });
  }

  const onTarget = points.filter((p) => p.count >= goal).length;
  const rangeAverage = period.current / range;

  /*
    One row per person, always all three regardless of the filter above - the
    point of this table is the side-by-side. Scoped to the selected window so
    the numbers answer "how are we doing lately", not "ever".
  */
  // Left to the React Compiler, like `points` above - `since` derives from
  // `today`, which isn't provably stable, so a manual dependency list here
  // only defeats optimisation.
  const since = shiftDayKey(today, -(range - 1));
  const breakdown = USER_IDS.map((id) => {
    const rows = connects.filter((c) => c.owner === id && c.sent_on >= since);
    return {
      id,
      sent: rows.length,
      accept: acceptanceRate(rows),
      reply: replyRate(rows),
      leads: funnel(rows).leads,
      target: (goals[id] ?? 0) * range,
    };
  });

  if (loading) return <StatsSkeleton />;

  return (
    <Page>
      <PageHeader
        title="Team"
        lead={
          scoped.length === 0
            ? "Numbers appear once you start logging."
            : `${scoped.length} connects logged across ${counts.size} active days${
                owner === "all" ? " by the three of you" : ""
              }.`
        }
        /*
          The one control that changes what every panel below means, so it sits
          beside the title rather than inside any one panel.
        */
        actions={
          <Segmented
            label="Whose numbers"
            options={OWNERS}
            value={owner}
            onChange={setOwner}
          />
        }
      />

      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Momentum
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Connects per day against{" "}
              {owner === "all"
                ? `the combined target of ${goal}`
                : owner === me.id
                  ? `your target of ${goal}`
                  : `${USER_LABEL[owner]}'s target of ${goal}`}
              .
            </p>
          </div>

          <Segmented
            label="Chart range"
            options={RANGES.map((r) => ({ value: r.days, label: r.label }))}
            value={range}
            onChange={setRange}
          />
        </div>

        <TrendChart className="mt-5" points={points} goal={goal} />

        <Well className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-4 py-3.5">
          <div>
            <Label>Sent in {range} days</Label>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <span className="tabular font-display text-3xl font-semibold">
                {period.current}
              </span>
              <Delta change={period.change} />
            </div>
          </div>

          <div className="flex gap-8">
            <div>
              <Label>Per day</Label>
              <div
                className={`tabular mt-1.5 font-display text-xl font-semibold ${
                  rangeAverage >= goal ? "text-brand" : "text-text"
                }`}
              >
                {rangeAverage.toFixed(1)}
              </div>
            </div>
            <div>
              <Label>On target</Label>
              <div className="tabular mt-1.5 font-display text-xl font-semibold">
                {onTarget}
                <span className="text-xs font-semibold text-muted"> / {range}</span>
              </div>
            </div>
          </div>
        </Well>
      </Card>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat
          label="Streak"
          value={String(streak)}
          detail={best > 0 ? `best ${best}` : "days at target"}
          tone={streak > 0 ? "brand" : "text"}
        />
        <Stat
          label="This week"
          value={String(week)}
          detail={`of ${weekTarget} so far`}
          tone={week >= weekTarget ? "brand" : "text"}
        />
        <Stat label="This month" value={String(month)} />
        <Stat label="Last 30 days" value={String(last30)} />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat
          label="Avg / active day"
          value={average.toFixed(1)}
          detail={average >= goal ? "above target" : `target ${goal}`}
          tone={average >= goal ? "brand" : "dim"}
        />
        <Stat
          label="Best day"
          value={peak ? String(peak.count) : "0"}
          detail={peak ? formatShort(peak.day) : undefined}
        />
        <Stat
          label="Accept rate"
          value={decided === 0 ? "-" : `${Math.round(rate * 100)}%`}
          detail={decided === 0 ? "no invites decided yet" : `of ${decided} decided`}
          tone={decided === 0 ? "text" : "brand"}
        />
        <Stat
          label="Reply rate"
          value={pitched === 0 ? "-" : `${Math.round(replies * 100)}%`}
          detail={pitched === 0 ? "send an opener first" : `of ${pitched} pitched`}
          tone={pitched === 0 ? "text" : "brand"}
        />
      </div>

      <Card className="mt-2.5 p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold">
            Side by side
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            The last {range} days, whoever is selected above.
          </p>
        </div>

        {/* Narrow screens scroll the table rather than the page. */}
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-soft text-left">
                <Th className="text-left">Person</Th>
                <Th>Sent</Th>
                <Th>Accept</Th>
                <Th>Reply</Th>
                <Th>Leads</Th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-line-soft/60 last:border-0 ${
                    row.id === me.id ? "bg-surface-2/40" : ""
                  }`}
                >
                  <td className="py-3 pr-3">
                    <span className="font-display font-semibold">
                      {USER_LABEL[row.id]}
                    </span>
                    {row.id === me.id && (
                      <span className="label ml-2 text-[10px] text-brand">
                        you
                      </span>
                    )}
                  </td>
                  <td className="tabular py-3 text-right font-semibold">
                    <span
                      className={row.sent >= row.target ? "text-brand" : "text-text"}
                    >
                      {row.sent}
                    </span>
                    <span className="text-muted"> / {row.target}</span>
                  </td>
                  <Td
                    value={
                      row.accept.decided === 0
                        ? "-"
                        : `${Math.round(row.accept.rate * 100)}%`
                    }
                    detail={
                      row.accept.decided === 0
                        ? undefined
                        : `${row.accept.decided} decided`
                    }
                  />
                  <Td
                    value={
                      row.reply.pitched === 0
                        ? "-"
                        : `${Math.round(row.reply.rate * 100)}%`
                    }
                    detail={
                      row.reply.pitched === 0
                        ? undefined
                        : `${row.reply.pitched} pitched`
                    }
                  />
                  <Td value={String(row.leads)} tone={row.leads > 0 ? "brand" : "text"} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-2.5 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Six months
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Every day since {formatShort(heatmapStart(HEATMAP_WEEKS, today))}.
            </p>
          </div>

          <div className="label flex items-center gap-1.5">
            none
            <span className="size-[11px] rounded-[2px] bg-line-soft" />
            <span className="size-[11px] rounded-[2px] bg-brand/18" />
            <span className="size-[11px] rounded-[2px] bg-brand/35" />
            <span className="size-[11px] rounded-[2px] bg-brand/60" />
            <span className="size-[11px] rounded-[2px] bg-brand" />
            target
          </div>
        </div>

        <Heatmap counts={counts} goal={goal} weeks={HEATMAP_WEEKS} />
      </Card>
    </Page>
  );
}
