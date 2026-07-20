"use client";

import { useMemo } from "react";
import { useData } from "@/components/DataProvider";
import { Heatmap } from "@/components/Heatmap";
import { dayKey, formatShort, shiftDayKey, weekStart } from "@/lib/date";
import {
  acceptanceRate,
  averagePerActiveDay,
  bestDay,
  bestStreak,
  countsByDay,
  currentStreak,
  replyRate,
  sumSince,
  totalsThisMonth,
  totalsThisWeek,
} from "@/lib/stats";

function Stat({
  label,
  value,
  detail,
  tone = "text",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "text" | "amber" | "teal";
}) {
  const color =
    tone === "amber" ? "text-amber" : tone === "teal" ? "text-teal" : "text-text";
  return (
    <div className="rounded-xl border border-line-soft bg-surface px-4 py-3.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div className={`tabular mt-1.5 font-display text-2xl font-bold ${color}`}>
        {value}
      </div>
      {detail && <div className="mt-0.5 text-xs text-muted">{detail}</div>}
    </div>
  );
}

export default function StatsPage() {
  const { connects, goal, loading } = useData();
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

  const daysThisWeek = Math.round(
    (new Date(today).getTime() - new Date(weekStart(today)).getTime()) / 86_400_000
  ) + 1;
  const weekTarget = goal * daysThisWeek;

  const recent: { day: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = shiftDayKey(today, -i);
    recent.push({ day, count: counts.get(day) ?? 0 });
  }
  const recentMax = Math.max(goal, ...recent.map((d) => d.count));

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-7">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Stats</h1>
        <p className="mt-1 text-sm text-muted">
          {connects.length === 0
            ? "Numbers appear once you start logging."
            : `${connects.length} connects logged across ${counts.size} active days.`}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat
          label="Streak"
          value={String(streak)}
          detail={best > 0 ? `best ${best}` : "days at target"}
          tone={streak > 0 ? "teal" : "text"}
        />
        <Stat
          label="This week"
          value={String(week)}
          detail={`of ${weekTarget} so far`}
          tone={week >= weekTarget ? "teal" : "text"}
        />
        <Stat label="This month" value={String(month)} />
        <Stat label="Last 30 days" value={String(last30)} />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat
          label="Avg / active day"
          value={average.toFixed(1)}
          detail={average >= goal ? "above target" : `target ${goal}`}
          tone={average >= goal ? "teal" : "amber"}
        />
        <Stat
          label="Best day"
          value={peak ? String(peak.count) : "0"}
          detail={peak ? formatShort(peak.day) : undefined}
        />
        <Stat
          label="Accept rate"
          value={decided === 0 ? "—" : `${Math.round(rate * 100)}%`}
          detail={
            decided === 0 ? "no invites decided yet" : `of ${decided} decided`
          }
          tone="teal"
        />
        <Stat
          label="Reply rate"
          value={pitched === 0 ? "—" : `${Math.round(replies * 100)}%`}
          detail={pitched === 0 ? "send an opener first" : `of ${pitched} pitched`}
          tone="teal"
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Last 14 days
        </h2>
        <div className="rounded-2xl border border-line-soft bg-surface p-4">
          <div className="flex h-32 items-end gap-1.5">
            {recent.map(({ day, count }) => {
              const height = recentMax === 0 ? 0 : (count / recentMax) * 100;
              const met = count >= goal;
              return (
                <div key={day} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      title={`${formatShort(day)} — ${count} sent`}
                      className={`w-full rounded-t-[3px] transition-all ${
                        count === 0 ? "bg-line-soft" : met ? "bg-teal" : "bg-amber/70"
                      }`}
                      style={{ height: `${Math.max(height, count > 0 ? 4 : 2)}%` }}
                    />
                  </div>
                  <span className="tabular font-mono text-[9px] text-muted">
                    {day.slice(-2)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 border-t border-line-soft pt-3 font-mono text-[10px] uppercase tracking-wide text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-teal" /> target met
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-amber/70" /> short
            </span>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Six months
        </h2>
        <div className="rounded-2xl border border-line-soft bg-surface p-4">
          <Heatmap counts={counts} goal={goal} />
        </div>
      </section>
    </div>
  );
}
