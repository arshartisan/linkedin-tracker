import { dayKey, shiftDayKey } from "./date";
import { USER_IDS, type Company, type Connect, type UserId } from "./types";
import type { Startup } from "./startup";

export const ACTIVITY_LABEL = {
  all: "All activity",
  linkedin: "LinkedIn",
  upwork: "Upwork jobs",
  companies: "Companies",
  startups: "Startups",
} as const;
export type ActivityKind = keyof typeof ACTIVITY_LABEL;

export type DatePreset = "today" | "yesterday" | "7" | "14" | "30" | "90" | "custom";
export function teamDateRange(preset: DatePreset, today: string, custom: { from: string; to: string }) {
  if (preset === "custom") return custom;
  if (preset === "today") return { from: today, to: today };
  if (preset === "yesterday") {
    const yesterday = shiftDayKey(today, -1);
    return { from: yesterday, to: yesterday };
  }
  return { from: shiftDayKey(today, -(Number(preset) - 1)), to: today };
}

/** One entry per tracked record, dated in the same local calendar as the UI. */
export function activityCountsByDay(connects: Connect[], companies: Company[], startups: Startup[], owner: UserId | "all", kind: ActivityKind): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (recordOwner: UserId, day: string) => {
    if ((owner === "all" || owner === recordOwner) && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  };
  for (const row of connects) {
    const category = row.upwork_url ? "upwork" : "linkedin";
    if (kind === "all" || kind === category) add(row.owner, row.sent_on);
  }
  if (kind === "all" || kind === "companies") {
    for (const row of companies) add(row.owner, dayKey(new Date(row.created_at)));
  }
  if (kind === "all" || kind === "startups") {
    for (const row of startups) add(row.owner, dayKey(new Date(row.created_at)));
  }
  return counts;
}

/** A linked client profile on an Upwork job is research, not another invite. */
export function linkedinConnects(rows: Connect[]): Connect[] {
  return rows.filter((row) => !row.upwork_url);
}

export function teamActivity(connects: Connect[], companies: Company[], since: string, until: string, owner: UserId | "all" = "all") {
  const inRange = (day: string) => day >= since && day <= until;
  return USER_IDS.filter((id) => owner === "all" || id === owner).map((id) => {
    const rows = connects.filter((row) => row.owner === id && inRange(row.sent_on));
    const jobs = rows.filter((row) => Boolean(row.upwork_url));
    const firms = companies.filter((row) => row.owner === id && inRange(dayKey(new Date(row.created_at))));
    return {
      id,
      linkedin: linkedinConnects(rows).length,
      jobs: jobs.length,
      jobsReached: jobs.filter((row) => row.outreach_channels.length > 0).length,
      companies: firms.length,
      companiesReached: firms.filter((row) => row.outreach_channels.length > 0).length,
    };
  });
}
