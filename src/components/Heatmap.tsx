"use client";

import { dayKey, formatShort, parseDayKey, shiftDayKey, weekStart } from "@/lib/date";

/** Cell size and gutter, in px. The column pitch falls out of the two. */
const CELL = 11;
const GAP = 3;
const PITCH = CELL + GAP;

/**
 * Six months of days, one column per week starting Monday. Colour encodes
 * effort against the goal on a single ramp, and only a day that actually hit
 * the goal reaches full strength — so a wall of solid lime means a wall of met
 * targets, and a day that beat the goal is the only thing that glows.
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
    const ratio = n / goal;
    if (ratio > 1) return "bg-brand shadow-[0_0_7px_-1px_var(--brand)]";
    if (ratio >= 1) return "bg-brand";
    if (ratio >= 0.66) return "bg-brand/60";
    if (ratio >= 0.33) return "bg-brand/35";
    return "bg-brand/18";
  }

  // Label a column when its Monday opens a new month.
  const monthLabels = columns.map((column) => {
    const first = parseDayKey(column[0]);
    const prev = parseDayKey(shiftDayKey(column[0], -7));
    return first.getMonth() !== prev.getMonth()
      ? first.toLocaleDateString(undefined, { month: "short" })
      : "";
  });

  const width = weeks * PITCH - GAP;

  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex flex-col gap-1.5" style={{ width }}>
        {/*
          A month name is three characters wide and a column is eleven pixels,
          so the labels cannot live *in* the grid — laid out as flex items they
          overflow their cell and shove every later month out of register.
          They're absolutely positioned against the column pitch instead, which
          pins each one to the week it names and lets it overhang freely.
        */}
        <div className="relative h-3">
          {monthLabels.map((label, i) =>
            label ? (
              <span
                key={i}
                className="absolute top-0 font-mono text-[9px] uppercase tracking-wide text-muted"
                style={{ left: i * PITCH }}
              >
                {label}
              </span>
            ) : null
          )}
        </div>

        <div className="flex" style={{ gap: GAP }}>
          {columns.map((column, i) => (
            <div key={i} className="flex flex-col" style={{ gap: GAP }}>
              {column.map((day) => (
                <div
                  key={day}
                  title={`${formatShort(day)} — ${counts.get(day) ?? 0} sent`}
                  className={`rounded-[2px] ${tone(day)}`}
                  style={{ width: CELL, height: CELL }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
