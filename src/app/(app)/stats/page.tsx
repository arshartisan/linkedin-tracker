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

  const momentumCounts = useMemo(() => activityCountsByDay(connects, companies, startups, owner, kind), [connects, companies, startups, owner, kind]);
  const momentumGoal = kind === "linkedin" ? goal : undefined;

  const selectedLinkedin = scoped.filter((row) => row.sent_on >= since && row.sent_on <= until);
  const activityUnavailable = (kind === "all" || kind === "startups") && (startupsLoading || Boolean(startupsError));
  const selectedCounts = new Map([...momentumCounts].filter(([day]) => day >= since && day <= until));
  const best = bestStreak(selectedCounts, momentumGoal ?? 1);
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
    const counts = activityCountsByDay(connects, companies, startups, id, kind);
    const selected = new Map([...counts].filter(([day]) => day >= since && day <= until));
    const total = periodDelta(counts, range, until).current;
    const categories = (["linkedin", "upwork", "companies", "startups"] as const).map((category) => ({
      category, total: periodDelta(activityCountsByDay(connects, companies, startups, id, category), range, until).current,
    }));
    return { id, total, activeDays: selected.size, categories };
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
            <Select.Trigger aria-label="Filter statistics by activity"><Select.Value /></Select.Trigger>
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

      <h2 className="mt-6 mb-2 font-display text-lg font-semibold">{ACTIVITY_LABEL[kind]} in the selected period</h2>
      {activityUnavailable ? <p role={startupsError ? "alert" : "status"} className="py-6 text-sm text-muted">{startupsError ? "Activity statistics unavailable until startup activity can be loaded." : "Loading activity statistics..."}</p> : <>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Stat label="Best streak" value={String(best)} detail={momentumGoal === undefined ? "consecutive active days" : "consecutive days at target"} tone={best > 0 ? "brand" : "text"} />
        <Stat label="Records logged" value={String(period.current)} detail={formatShort(since) + " - " + formatShort(until)} />
        <Stat label="Active days" value={String(selectedCounts.size)} detail={"of " + range + " days"} />
        <Stat label="Avg / active day" value={average.toFixed(1)} detail={momentumGoal === undefined ? "records per active day" : "daily target " + momentumGoal} />
        <Stat label="Best day" value={peak ? String(peak.count) : "0"} detail={peak ? formatShort(peak.day) : undefined} />
        <Stat label="Avg / calendar day" value={rangeAverage.toFixed(1)} detail="including days with no activity" />
      </div>
      {kind === "linkedin" && <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Stat label="Leads" value={String(funnel(selectedLinkedin).leads)} />
        <Stat label="Accept rate" value={decided === 0 ? "-" : Math.round(rate * 100) + "%"} detail={decided === 0 ? "no invites decided yet" : "of " + decided + " decided"} />
        <Stat label="Reply rate" value={pitched === 0 ? "-" : Math.round(replies * 100) + "%"} detail={pitched === 0 ? "send an opener first" : "of " + pitched + " pitched"} />
      </div>}
      </>}

      <Card className="mt-2.5 p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold">
            Activity side by side
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {formatShort(since)} – {formatShort(until)}, all members for comparison. Totals and active days follow the activity filter.
          </p>
        </div>

        {activityUnavailable ? <p className="py-6 text-sm text-muted">{startupsError ? "Member comparison unavailable until startup activity can be loaded." : "Loading member comparison..."}</p> : <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[42rem] border-collapse text-sm">
            <caption className="sr-only">Activity by member for the selected period</caption>
            <thead><tr className="border-b border-line-soft"><Th className="text-left">Person</Th><Th>Total</Th><Th>Active days</Th><Th>LinkedIn</Th><Th>Upwork jobs</Th><Th>Companies</Th><Th>Startups</Th></tr></thead>
            <tbody>{breakdown.map((row) => <tr key={row.id} className={"border-b border-line-soft/60 last:border-0 " + (row.id === me.id ? "bg-surface-2/40" : "")}>
              <td className="py-3 pr-3"><span className="font-display font-semibold">{USER_LABEL[row.id]}</span>{row.id === me.id && <span className="label ml-2 text-[10px] text-brand">you</span>}</td>
              <Td value={String(row.total)} /><Td value={String(row.activeDays)} />
              {row.categories.map(({category, total}) => <Td key={category} value={category === "startups" && (startupsLoading || startupsError) ? "-" : String(total)} />)}
            </tr>)}</tbody>
          </table>
        </div>}
      </Card>

      <Card className="mt-2.5 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">
              {ACTIVITY_LABEL[kind]} history &mdash; six months
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Fixed history since {formatShort(heatmapStart(HEATMAP_WEEKS, today))}; follows the member and activity filters. Each record counts once, on its logged date.
            </p>
          </div>

          <div className="label flex items-center gap-1.5">
            none
            <span className="size-[11px] rounded-[2px] bg-line-soft" />
            <span className="size-[11px] rounded-[2px] bg-brand/18" />
            <span className="size-[11px] rounded-[2px] bg-brand/35" />
            <span className="size-[11px] rounded-[2px] bg-brand/60" />
            <span className="size-[11px] rounded-[2px] bg-brand" />
            {momentumGoal === undefined ? "more" : "target"}
          </div>
        </div>

        {activityUnavailable ? <p className="py-6 text-sm text-muted">{startupsError ? "Activity history unavailable until startup activity can be loaded." : "Loading activity history..."}</p>
          : <Heatmap counts={momentumCounts} goal={momentumGoal} weeks={HEATMAP_WEEKS} unit="records logged" />}
      </Card>
    </Page>
  );
}
