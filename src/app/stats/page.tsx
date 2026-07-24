"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { Heatmap } from "@/components/Heatmap";
import { TrendChart } from "@/components/TrendChart";
import { Skeleton } from "@/components/ui/skeleton";
import { dayKey, formatShort, shiftDayKey, weekStart } from "@/lib/date";
import { diffDays } from "@/lib/pipeline";
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

const RANGES = [
  { days: 14, label: "14d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
] as const;

type Tone = "text" | "brand" | "dim";

const TONE: Record<Tone, string> = {
  text: "text-text",
  brand: "text-brand",
  dim: "text-brand-dim",
};

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line-soft bg-surface ${className}`}
    >
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
      {children}
    </div>
  );
}

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
    <div className="rounded-2xl border border-line-soft bg-surface px-4 py-3.5 transition-colors hover:border-line">
      <Label>{label}</Label>
      <div
        className={`tabular mt-1.5 font-display text-2xl font-bold ${TONE[tone]}`}
      >
        {value}
      </div>
      {detail && <div className="mt-0.5 text-xs text-muted">{detail}</div>}
    </div>
  );
}

/**
 * Direction against the previous window of the same length. A fall is muted
 * rather than red - a quiet week is a fact, not an error, and rose is spoken
 * for by things that actually need attention.
 */
function Delta({ change }: { change: number | null }) {
  if (change === null) return null;
  const up = change >= 0;
  const percent = Math.abs(Math.round(change * 100));
  return (
    <span
      className={`tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] ${
        up ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted"
      }`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {percent}%
      <span className="sr-only">
        {up ? "up" : "down"} on the previous period
      </span>
    </span>
  );
}

function StatsSkeleton() {
  return (
    <div className="px-5 py-8 sm:px-8 sm:py-12">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mt-2 h-4 w-64" />
      <Skeleton className="mt-7 h-[26rem] w-full rounded-2xl" />
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { connects, goal, loading } = useData();
  const [range, setRange] = useState<number>(14);

  const counts = useMemo(() => countsByDay(connects), [connects]);
  const today = dayKey();

  const streak = currentStreak(counts, goal);
  const best = bestStreak(counts, goal);
  const week = totalsThisWeek(counts);
  const month = totalsThisMonth(counts);
  const last30 = sumSince(counts, shiftDayKey(today, -29));
  const average = averagePerActiveDay(counts);
  const peak = bestDay(counts);
  const { rate, decided } = acceptanceRate(connects);
  const { rate: replies, pitched } = replyRate(connects);

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

  if (loading) return <StatsSkeleton />;

  return (
    <div className="px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-7">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Stats
        </h1>
        <p className="mt-1 text-sm text-muted">
          {connects.length === 0
            ? "Numbers appear once you start logging."
            : `${connects.length} connects logged across ${counts.size} active days.`}
        </p>
      </header>

      <Panel className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">
              Momentum
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Connects per day against your target of {goal}.
            </p>
          </div>

          {/*
            A segmented control rather than a dropdown: three options, and the
            one you're on should be readable without opening anything.
          */}
          <div
            role="group"
            aria-label="Chart range"
            className="flex rounded-lg border border-line-soft bg-ink p-0.5"
          >
            {RANGES.map((option) => {
              const selected = option.days === range;
              return (
                <button
                  key={option.days}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRange(option.days)}
                  className={`tabular cursor-pointer rounded-[6px] px-3 py-1.5 font-mono text-xs transition-colors ${
                    selected
                      ? "bg-brand text-ink"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <TrendChart className="mt-5" points={points} goal={goal} />

        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-line-soft pt-4">
          <div>
            <Label>Sent in {range} days</Label>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <span className="tabular font-display text-3xl font-bold">
                {period.current}
              </span>
              <Delta change={period.change} />
            </div>
          </div>

          <div className="flex gap-8">
            <div>
              <Label>Per day</Label>
              <div
                className={`tabular mt-1.5 font-display text-xl font-bold ${
                  rangeAverage >= goal ? "text-brand" : "text-text"
                }`}
              >
                {rangeAverage.toFixed(1)}
              </div>
            </div>
            <div>
              <Label>On target</Label>
              <div className="tabular mt-1.5 font-display text-xl font-bold">
                {onTarget}
                <span className="font-mono text-xs font-normal text-muted">
                  {" "}
                  / {range}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

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

      <Panel className="mt-2.5 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">
              Six months
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Every day since {formatShort(shiftDayKey(today, -181))}.
            </p>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-muted uppercase">
            none
            <span className="size-[11px] rounded-[2px] bg-line-soft" />
            <span className="size-[11px] rounded-[2px] bg-brand/18" />
            <span className="size-[11px] rounded-[2px] bg-brand/35" />
            <span className="size-[11px] rounded-[2px] bg-brand/60" />
            <span className="size-[11px] rounded-[2px] bg-brand" />
            target
          </div>
        </div>

        <Heatmap counts={counts} goal={goal} />
      </Panel>
    </div>
  );
}
