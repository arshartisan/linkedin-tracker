"use client";

import { dayKey, formatShort, parseDayKey, shiftDayKey, weekStart } from "@/lib/date";

/**
 * Six months of days, one column per week starting Monday. Colour encodes
 * effort against the goal, and only a day that actually hit the goal gets
 * full amber — so a wall of solid colour means a wall of met targets.
 */
export function Heatmap({
  counts,
  goal,
  weeks = 26,
}: {
  counts: Map<string, number>;
  goal: number;
  weeks?: number;
}) {
  const today = dayKey();
  const start = weekStart(shiftDayKey(today, -(weeks * 7 - 1)));

  const columns: string[][] = [];
  let cursor = start;
  for (let w = 0; w < weeks; w++) {
    const column: string[] = [];
    for (let d = 0; d < 7; d++) {
      column.push(cursor);
      cursor = shiftDayKey(cursor, 1);
    }
    columns.push(column);
  }

  function tone(day: string) {
    if (day > today) return "bg-transparent";
    const n = counts.get(day) ?? 0;
    if (n === 0) return "bg-line-soft";
    if (n > goal) return "bg-teal";
    const ratio = n / goal;
    if (ratio >= 1) return "bg-amber";
    if (ratio >= 0.66) return "bg-amber/65";
    if (ratio >= 0.33) return "bg-amber/40";
    return "bg-amber/20";
  }

  // Label a column when its Monday opens a new month.
  const monthLabels = columns.map((column) => {
    const first = parseDayKey(column[0]);
    const prev = parseDayKey(shiftDayKey(column[0], -7));
    return first.getMonth() !== prev.getMonth()
      ? first.toLocaleDateString(undefined, { month: "short" })
      : "";
  });

  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex min-w-full flex-col gap-1.5">
        <div className="flex gap-[3px]">
          {monthLabels.map((label, i) => (
            <div
              key={i}
              className="w-[11px] font-mono text-[9px] uppercase tracking-wide text-muted"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {columns.map((column, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {column.map((day) => (
                <div
                  key={day}
                  title={`${formatShort(day)} — ${counts.get(day) ?? 0} sent`}
                  className={`h-[11px] w-[11px] rounded-[2px] ${tone(day)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
