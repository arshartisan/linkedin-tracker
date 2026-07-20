import type { Connect } from "./types";
import { dayKey, monthKey, shiftDayKey, weekStart } from "./date";

export function countsByDay(connects: Connect[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of connects) map.set(c.sent_on, (map.get(c.sent_on) ?? 0) + 1);
  return map;
}

/**
 * Days in a row that hit the goal, counting back from today. Today is only
 * counted once it's hit — an unfinished today doesn't break yesterday's run,
 * because the day isn't over yet.
 */
export function currentStreak(counts: Map<string, number>, goal: number): number {
  const today = dayKey();
  let cursor = (counts.get(today) ?? 0) >= goal ? today : shiftDayKey(today, -1);
  let streak = 0;
  while ((counts.get(cursor) ?? 0) >= goal) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

export function bestStreak(counts: Map<string, number>, goal: number): number {
  const hits = [...counts.entries()]
    .filter(([, n]) => n >= goal)
    .map(([k]) => k)
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of hits) {
    run = prev && shiftDayKey(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

export function sumSince(counts: Map<string, number>, from: string): number {
  let total = 0;
  for (const [day, n] of counts) if (day >= from) total += n;
  return total;
}

export function totalsThisWeek(counts: Map<string, number>): number {
  return sumSince(counts, weekStart(dayKey()));
}

export function totalsThisMonth(counts: Map<string, number>): number {
  const month = monthKey(dayKey());
  let total = 0;
  for (const [day, n] of counts) if (monthKey(day) === month) total += n;
  return total;
}

export function bestDay(counts: Map<string, number>): { day: string; count: number } | null {
  let best: { day: string; count: number } | null = null;
  for (const [day, count] of counts) {
    if (!best || count > best.count) best = { day, count };
  }
  return best;
}

/** Average per active day — days with zero sent would drag this to nothing. */
export function averagePerActiveDay(counts: Map<string, number>): number {
  if (counts.size === 0) return 0;
  let total = 0;
  for (const n of counts.values()) total += n;
  return total / counts.size;
}

export function acceptanceRate(connects: Connect[]): { rate: number; decided: number } {
  const decided = connects.filter((c) => c.status !== "pending");
  if (decided.length === 0) return { rate: 0, decided: 0 };
  const accepted = decided.filter((c) => c.status === "accepted").length;
  return { rate: accepted / decided.length, decided: decided.length };
}

/** Day keys for a trailing window, oldest first — the heatmap's spine. */
export function trailingDays(n: number, end: string = dayKey()): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(shiftDayKey(end, -i));
  return days;
}
