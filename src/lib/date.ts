/**
 * Every day boundary in this app is the user's *local* midnight — a connect
 * sent at 11pm belongs to that day, not to UTC's tomorrow. So day keys are
 * built from local date parts, never from toISOString().
 */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function shiftDayKey(key: string, n: number): string {
  return dayKey(addDays(parseDayKey(key), n));
}

/** Monday-start week key for the week containing `key`. */
export function weekStart(key: string): string {
  const d = parseDayKey(key);
  const offset = (d.getDay() + 6) % 7;
  return dayKey(addDays(d, -offset));
}

export function monthKey(key: string): string {
  return key.slice(0, 7);
}

export function formatLong(key: string): string {
  return parseDayKey(key).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShort(key: string): string {
  return parseDayKey(key).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeDay(key: string): string | null {
  const today = dayKey();
  if (key === today) return "Today";
  if (key === shiftDayKey(today, -1)) return "Yesterday";
  return null;
}
