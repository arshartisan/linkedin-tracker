"use client";

import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
  type HeatmapColumn,
} from "@/components/charts/heatmap";
import { CHART_SCALE_VARS } from "@/components/charts/chart-scale";
import { dayKey, formatShort, parseDayKey, shiftDayKey } from "@/lib/date";

/**
 * The Sunday the grid opens on: `weeks` columns back from the Sunday of the
 * week we're in, so the last column is the current week and today always has a
 * cell. bklit's heatmap lays its rows out Sunday-first.
 */
export function heatmapStart(weeks: number, today: string = dayKey()): string {
  const sunday = shiftDayKey(today, -parseDayKey(today).getDay());
  return shiftDayKey(sunday, -(weeks - 1) * 7);
}

/**
 * Six months of days as a bklit heatmap, one column per week. Colour encodes
 * effort against the goal, and only a day that hit the goal reaches full
 * strength - so a wall of solid lime means a wall of met targets. Without a
 * goal, intensity follows the busiest visible day.
 */
export function Heatmap({
  counts,
  goal,
  weeks = 26,
  unit = "sent",
}: {
  counts: Map<string, number>;
  goal?: number;
  unit?: string;
  weeks?: number;
}) {
  const today = dayKey();
  const start = heatmapStart(weeks, today);

  const data: HeatmapColumn[] = [];
  let cursor = start;
  for (let w = 0; w < weeks; w++) {
    const bins = [];
    for (let d = 0; d < 7; d++) {
      // Future days get no cell rather than an empty one that reads as a miss.
      if (cursor <= today) bins.push({ bin: d, count: counts.get(cursor) ?? 0, date: parseDayKey(cursor) });
      cursor = shiftDayKey(cursor, 1);
    }
    data.push({ bin: w, bins });
  }

  const scale = goal && goal > 0 ? goal : Math.max(1, ...[...counts].filter(([day]) => day >= start && day <= today).map(([, count]) => count));

  function colorScale(count: number | null | undefined) {
    const n = count ?? 0;
    if (n <= 0) return CHART_SCALE_VARS[0];
    const ratio = n / scale;
    if (ratio >= 1) return CHART_SCALE_VARS[4];
    if (ratio >= 0.66) return CHART_SCALE_VARS[3];
    if (ratio >= 0.33) return CHART_SCALE_VARS[2];
    return CHART_SCALE_VARS[1];
  }

  return (
    <HeatmapInteractionProvider>
      <HeatmapInteractionBoundary>
        <HeatmapChart data={data} layout="fluid" gap={3} colorScale={colorScale} margin={{ top: 20, right: 0, bottom: 0, left: 32 }}>
          <HeatmapCells />
          <HeatmapXAxis />
          <HeatmapYAxis />
          <HeatmapTooltip formatLabel={(count, date) => `${formatShort(dayKey(date))} · ${count} ${unit}`} />
        </HeatmapChart>
        <HeatmapLegend className="mt-3" interactive={false} lessLabel="none" moreLabel={goal ? "target" : "more"} />
      </HeatmapInteractionBoundary>
    </HeatmapInteractionProvider>
  );
}
