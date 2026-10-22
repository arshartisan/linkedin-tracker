"use client";

import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";

export type MemberSeries = { key: string; label: string; color: string };

/** One stacked bar per member, a segment per activity category. */
export function MemberBarChart({
  rows,
  series,
  className = "",
}: {
  rows: ({ name: string } & Record<string, number | string>)[];
  series: MemberSeries[];
  className?: string;
}) {
  return (
    <div className={className}>
      <BarChart data={rows} xDataKey="name" stacked stackGap={2} barGap={0.45} aspectRatio="3 / 1" margin={{ top: 24, right: 16, bottom: 32, left: 16 }}>
        <Grid horizontal numTicksRows={4} />
        {series.map((s) => <Bar key={s.key} dataKey={s.key} fill={s.color} lineCap={4} />)}
        <BarXAxis showAllLabels />
        <ChartTooltip
          showDatePill={false}
          rows={(point) => series.map((s) => ({ color: s.color, label: s.label, value: Number(point[s.key] ?? 0) }))}
        />
      </BarChart>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
        {series.map((s) => <li key={s.key} className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />{s.label}</li>)}
      </ul>
    </div>
  );
}
