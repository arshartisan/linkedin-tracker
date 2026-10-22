"use client";

import { Area, AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { formatShort, parseDayKey } from "@/lib/date";

export type TrendPoint = { day: string; count: number };

/**
 * Daily activity as a bklit area chart. A goal, when there is one, rides along
 * as a flat dashed series so it both draws the target line and keeps the
 * y-domain tall enough to show it on days well under target.
 */
export function TrendChart({
  points,
  goal,
  label = "Connects",
  className = "",
}: {
  points: TrendPoint[];
  goal?: number;
  label?: string;
  className?: string;
}) {
  if (points.length < 2) {
    const point = points[0];
    return (
      <div
        className={`flex h-52 flex-col items-center justify-center gap-1 rounded-well border border-dashed border-line ${className}`}
      >
        {point ? <>
          <span className="tabular text-2xl font-semibold">{point.count}{goal === undefined ? "" : <span className="text-sm text-muted"> / {goal}</span>}</span>
          <p className="text-xs text-muted">{label} on {formatShort(point.day)}</p>
        </> : <p className="text-sm text-muted">Not enough days logged yet.</p>}
      </div>
    );
  }

  const data = points.map((p) => ({
    date: parseDayKey(p.day),
    count: p.count,
    ...(goal === undefined ? {} : { target: goal }),
  }));
  const total = points.reduce((sum, p) => sum + p.count, 0);

  return (
    <div
      className={className}
      role="img"
      aria-label={`${label} per day over the last ${points.length} days, ${total} in total${goal === undefined ? "." : `, against a daily target of ${goal}.`}`}
    >
      <AreaChart data={data} aspectRatio="3 / 1" margin={{ top: 24, right: 16, bottom: 32, left: 16 }}>
        <Grid horizontal numTicksRows={4} />
        <Area dataKey="count" fill="var(--chart-line-primary)" fillOpacity={0.3} strokeWidth={2} />
        {goal !== undefined && (
          <Area
            dataKey="target"
            stroke="var(--muted)"
            fill="var(--muted)"
            fillOpacity={0}
            strokeWidth={1}
            dashFromIndex={0}
            dashArray="3,4"
            showHighlight={false}
          />
        )}
        <XAxis numTicks={4} />
        <ChartTooltip
          rows={(point) => [
            { color: "var(--chart-line-primary)", label, value: Number(point.count ?? 0) },
            ...(goal === undefined ? [] : [{ color: "var(--muted)", label: "Daily target", value: goal }]),
          ]}
        />
      </AreaChart>
    </div>
  );
}
