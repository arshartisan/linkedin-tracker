"use client";

import { useEffect, useMemo, useState } from "react";
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
import { dayKey, formatShort, shiftDayKey } from "@/lib/date";
import { diffDays, funnel } from "@/lib/pipeline";
import { USER_IDS, USER_LABEL, type UserId } from "@/lib/types";
import { ACTIVITY_LABEL, activityCountsByDay, linkedinConnects, teamActivity, teamDateRange, type DatePreset, type ActivityKind } from "@/lib/team";
import { TeamDateFilter } from "@/components/TeamDateFilter";
import * as Select from "@/components/ui/select";
import { startupStore } from "@/lib/startup-store";
import type { Startup } from "@/lib/startup";
import {
  acceptanceRate,
  averagePerActiveDay,
  bestDay,
  bestStreak,
  countsByDay,
  periodDelta,
  replyRate,
} from "@/lib/stats";

/** Kept beside the caption below, which has to name the same window. */
const HEATMAP_WEEKS = 26;

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
  const { connects, companies, goals, me, loading } = useData();
  const today = dayKey();
  const [datePreset, setDatePreset] = useState<DatePreset>("14");
  const [customDates, setCustomDates] = useState({ from: shiftDayKey(today, -13), to: today });
  const { from: since, to: until } = teamDateRange(datePreset, today, customDates);
  const range = diffDays(since, until) + 1;
  const [owner, setOwner] = useState<Owner>("all");
  const [kind, setKind] = useState<ActivityKind>("all");
  const [startups, setStartups] = useState<Startup[]>([]);
  const [startupsLoading, setStartupsLoading] = useState(true);
  const [startupsError, setStartupsError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    startupStore.list().then((rows) => { if (!cancelled) setStartups(rows); })
      .catch((err: Error) => { if (!cancelled) setStartupsError(err.message); })
      .finally(() => { if (!cancelled) setStartupsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Keep invite-specific conversion rates separate from the combined activity chart.
  const scoped = useMemo(
    () => linkedinConnects(owner === "all" ? connects : connects.filter((c) => c.owner === owner)),
    [connects, owner]
  );

  // Daily goals are configured for LinkedIn; other activity has no target yet.
  const goal =
    owner === "all"
      ? USER_IDS.reduce((sum, id) => sum + (goals[id] ?? 0), 0)
      : goals[owner];

  const counts = useMemo(() => countsByDay(scoped), [scoped]);
  const momentumCounts = useMemo(() => activityCountsByDay(connects, companies, startups, owner, kind), [connects, companies, startups, owner, kind]);
  const momentumGoal = kind === "linkedin" ? goal : undefined;

  const selectedLinkedin = scoped.filter((row) => row.sent_on >= since && row.sent_on <= until);
  const selectedCounts = countsByDay(selectedLinkedin);
  const best = bestStreak(selectedCounts, goal);
  const average = averagePerActiveDay(selectedCounts);
  const peak = bestDay(selectedCounts);
  const { rate, decided } = acceptanceRate(selectedLinkedin);
  const { rate: replies, pitched } = replyRate(selectedLinkedin);

  const period = periodDelta(momentumCounts, range, until);

  // Left to the React Compiler rather than a useMemo - `today` isn't provably
  // stable to it, so a manual dependency list here only defeats optimisation.
  const points: { day: string; count: number }[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const day = shiftDayKey(until, -i);
    points.push({ day, count: momentumCounts.get(day) ?? 0 });
  }

  const onTarget = points.filter((p) => momentumGoal === undefined ? p.count > 0 : p.count >= momentumGoal).length;
  const rangeAverage = period.current / range;

  // The overview follows both the selected member and inclusive date range.
  const activity = teamActivity(connects, companies, since, until, owner).map((row) => {
    const firms = startups.filter((startup) => {
      const day = dayKey(new Date(startup.created_at));
      return startup.owner === row.id && day >= since && day <= until;
    });
    return { ...row, startups: firms.length, startupsReached: firms.filter((startup) => startup.outreach_channels.length > 0).length };
  });
  const activityTotals = activity.reduce((total, row) => ({
    linkedin: total.linkedin + row.linkedin,
    jobs: total.jobs + row.jobs,
    jobsReached: total.jobsReached + row.jobsReached,
    companies: total.companies + row.companies,
    companiesReached: total.companiesReached + row.companiesReached,
    startups: total.startups + row.startups,
    startupsReached: total.startupsReached + row.startupsReached,
  }), { linkedin: 0, jobs: 0, jobsReached: 0, companies: 0, companiesReached: 0, startups: 0, startupsReached: 0 });
  const breakdown = USER_IDS.map((id) => {
    const rows = linkedinConnects(connects).filter((c) => c.owner === id && c.sent_on >= since && c.sent_on <= until);
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
        lead="LinkedIn connections, Upwork jobs, companies, and startups across the team."
        /*
          The one control that changes what every panel below means, so it sits
          beside the title rather than inside any one panel.
        */
        actions={
          <><TeamDateFilter value={datePreset} onChange={setDatePreset} custom={customDates} onCustomChange={setCustomDates} today={today} /><Segmented
            label="Whose numbers"
            options={OWNERS}
            value={owner}
            onChange={setOwner}
          /></>
        }
      />

      <Card className="mb-4 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-display text-lg font-semibold">Outreach overview</h2><p className="mt-1 text-xs text-muted">{formatShort(since)} – {formatShort(until)}. Reached means at least one outreach channel was logged. Counts use each record’s logged date.</p></div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <Well className="p-4"><Label>LinkedIn connections</Label><p className="tabular mt-2 text-2xl font-semibold">{activityTotals.linkedin}</p></Well>
          <Well className="p-4"><Label>Upwork jobs</Label><p className="tabular mt-2 text-2xl font-semibold">{activityTotals.jobs}</p><p className="mt-1 text-xs text-muted">{activityTotals.jobsReached} approached</p></Well>
          <Well className="p-4"><Label>Companies reached</Label><p className="tabular mt-2 text-2xl font-semibold">{activityTotals.companiesReached}</p><p className="mt-1 text-xs text-muted">{activityTotals.companies} companies registered</p></Well>
          <Well className="p-4"><Label>Startups</Label><p className="tabular mt-2 text-2xl font-semibold">{startupsLoading || startupsError ? "—" : activityTotals.startups}</p><p className="mt-1 text-xs text-muted">{startupsLoading ? "Loading…" : startupsError ? "Startup activity unavailable" : `${activityTotals.startupsReached} reached`}</p></Well>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">Outreach by member for the selected date range</caption>
            <thead><tr className="border-b border-line-soft"><Th className="text-left">Member</Th><Th>LinkedIn</Th><Th>Jobs logged</Th><Th>Jobs approached</Th><Th>Companies reached</Th><Th>Startups</Th></tr></thead>
            <tbody>{activity.map((row) => <tr key={row.id} className="border-b border-line-soft last:border-0"><td className="py-3 font-medium">{USER_LABEL[row.id]}</td><Td value={String(row.linkedin)} /><Td value={String(row.jobs)} /><Td value={String(row.jobsReached)} /><Td value={String(row.companiesReached)} detail={`${row.companies} registered`} /><Td value={startupsLoading || startupsError ? "—" : String(row.startups)} detail={startupsLoading || startupsError ? undefined : `${row.startupsReached} reached`} /></tr>)}</tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Activity momentum
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {ACTIVITY_LABEL[kind]} per day, {formatShort(since)} – {formatShort(until)}.
              {momentumGoal !== undefined ? ` Daily LinkedIn target: ${momentumGoal}.` : " Each record counts once, on its logged date."}
            </p>
          </div>

          <Select.Root value={kind} onValueChange={(value) => setKind(value as ActivityKind)}>
            <Select.Trigger aria-label="Filter momentum by activity"><Select.Value /></Select.Trigger>
            <Select.Content align="end"><Select.Group><Select.GroupLabel>Activity</Select.GroupLabel>{Object.entries(ACTIVITY_LABEL).map(([value, label]) => <Select.Item key={value} value={value}>{label}</Select.Item>)}</Select.Group></Select.Content>
          </Select.Root>
        </div>

        {(kind === "all" || kind === "startups") && startupsLoading ? <p role="status" className="py-10 text-sm text-muted">Loading startup activity…</p>
          : (kind === "all" || kind === "startups") && startupsError ? <p role="alert" className="py-10 text-sm text-rose">Could not load startup activity: {startupsError}. Select another activity to view its chart.</p>
          : <TrendChart key={`${kind}-${since}-${until}`} className="mt-5" points={points} goal={momentumGoal} label={ACTIVITY_LABEL[kind]} />}

        <Well className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-4 py-3.5">
          <div>
            <Label>Logged in {range} {range === 1 ? "day" : "days"}</Label>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <span className="tabular font-display text-3xl font-semibold">
                {(kind === "all" || kind === "startups") && (startupsLoading || startupsError) ? "—" : period.current}
              </span>
              {!((kind === "all" || kind === "startups") && (startupsLoading || startupsError)) && <Delta change={period.change} />}
            </div>
          </div>

          <div className="flex gap-8">
            <div>
              <Label>Per day</Label>
              <div
                className={`tabular mt-1.5 font-display text-xl font-semibold ${
                  momentumGoal !== undefined && rangeAverage >= momentumGoal ? "text-brand" : "text-text"
                }`}
              >
                {(kind === "all" || kind === "startups") && (startupsLoading || startupsError) ? "—" : rangeAverage.toFixed(1)}
              </div>
            </div>
            <div>
              <Label>{momentumGoal === undefined ? "Active days" : "On target"}</Label>
              <div className="tabular mt-1.5 font-display text-xl font-semibold">
                {(kind === "all" || kind === "startups") && (startupsLoading || startupsError) ? "—" : onTarget}
                <span className="text-xs font-semibold text-muted"> / {range}</span>
              </div>
            </div>
          </div>
        </Well>
      </Card>

      <h2 className="mt-6 mb-2 font-display text-lg font-semibold">LinkedIn in the selected period</h2>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat
          label="Best streak"
          value={String(best)}
          detail="consecutive days at target"
          tone={best > 0 ? "brand" : "text"}
        />
        <Stat
          label="Connections logged"
          value={String(selectedLinkedin.length)}
          detail={`${formatShort(since)} – ${formatShort(until)}`}
        />
        <Stat label="Active days" value={String(selectedCounts.size)} />
        <Stat label="Leads" value={String(funnel(selectedLinkedin).leads)} />
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
            LinkedIn side by side
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {formatShort(since)} – {formatShort(until)}, all members for comparison.
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
              LinkedIn history — six months
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Fixed history since {formatShort(heatmapStart(HEATMAP_WEEKS, today))}; follows the member filter.
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
