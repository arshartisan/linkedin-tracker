import type { Connect, Stage } from "./types";
import { dayKey, shiftDayKey } from "./date";

/** Two follow-ups, then the thread is done — chasing past that is noise. */
export const MAX_FOLLOWUPS = 2;

/** Days of silence before the next follow-up is due. */
export const FOLLOWUP_GAP_DAYS = 3;

/** Silence after the last follow-up before the queue suggests closing it out. */
export const STALE_AFTER_DAYS = 7;

export type ActionKind = "pitch" | "followup" | "qualify";

export type Action = {
  kind: ActionKind;
  /** Day this became (or becomes) actionable. */
  dueOn: string;
  /** Days past due; 0 means due today, negative means it's still upcoming. */
  overdue: number;
  label: string;
  /** Copy for the button that completes the action. */
  cta: string;
};

/**
 * The single next thing to do for one person — never a list, because a queue
 * you can argue with is a queue you don't clear.
 */
export function nextAction(c: Connect, today: string = dayKey()): Action | null {
  const daysLate = (due: string) => diffDays(due, today);

  switch (c.stage) {
    case "accepted": {
      const dueOn = c.accepted_on ?? c.sent_on;
      return {
        kind: "pitch",
        dueOn,
        overdue: daysLate(dueOn),
        label: "Send the opener",
        cta: "Messaged",
      };
    }
    case "messaged": {
      if (c.followups >= MAX_FOLLOWUPS) return null;
      const from = c.last_touch_on ?? c.messaged_on ?? c.sent_on;
      const dueOn = shiftDayKey(from, FOLLOWUP_GAP_DAYS);
      return {
        kind: "followup",
        dueOn,
        overdue: daysLate(dueOn),
        label: `Follow-up ${c.followups + 1} of ${MAX_FOLLOWUPS}`,
        cta: `Sent follow-up ${c.followups + 1}`,
      };
    }
    case "replied": {
      const dueOn = c.replied_on ?? c.sent_on;
      return {
        kind: "qualify",
        dueOn,
        overdue: daysLate(dueOn),
        label: "They replied — qualify",
        cta: "Mark as lead",
      };
    }
    default:
      return null;
  }
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. */
export function diffDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00`);
  const b = Date.parse(`${to}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** Both follow-ups spent and still silent — nothing left but to close it. */
export function isStale(c: Connect, today: string = dayKey()): boolean {
  if (c.stage !== "messaged" || c.followups < MAX_FOLLOWUPS) return false;
  const from = c.last_touch_on ?? c.messaged_on ?? c.sent_on;
  return diffDays(from, today) >= STALE_AFTER_DAYS;
}

export type Queue = {
  /** Actionable now, most overdue first. */
  due: { connect: Connect; action: Action }[];
  /** Follow-ups with a date in the future. */
  upcoming: { connect: Connect; action: Action }[];
  /** Invites still waiting on an accept — nothing to do but wait. */
  waiting: Connect[];
  /** Went quiet after both follow-ups. */
  stale: Connect[];
  leads: Connect[];
};

/**
 * One pass over every connect produces every bucket the app needs. Each page
 * reads from this instead of re-filtering the full list on its own.
 */
export function buildQueue(connects: Connect[], today: string = dayKey()): Queue {
  const due: Queue["due"] = [];
  const upcoming: Queue["upcoming"] = [];
  const waiting: Connect[] = [];
  const stale: Connect[] = [];
  const leads: Connect[] = [];

  for (const connect of connects) {
    if (connect.stage === "lead") {
      leads.push(connect);
      continue;
    }
    if (connect.stage === "pending") {
      waiting.push(connect);
      continue;
    }
    if (isStale(connect, today)) {
      stale.push(connect);
      continue;
    }
    const action = nextAction(connect, today);
    if (!action) continue;
    (action.overdue >= 0 ? due : upcoming).push({ connect, action });
  }

  // Most overdue first — the oldest debt is the most likely to go cold.
  due.sort((a, b) => b.action.overdue - a.action.overdue);
  upcoming.sort((a, b) => a.action.dueOn.localeCompare(b.action.dueOn));
  leads.sort((a, b) => (b.lead_on ?? "").localeCompare(a.lead_on ?? ""));

  return { due, upcoming, waiting, stale, leads };
}

export type StagePatch = Partial<Connect>;

/**
 * Moving to a stage also stamps the day it happened, so follow-up timing and
 * the funnel work without a separate bookkeeping step. Already-set stamps are
 * kept — going back and forth shouldn't rewrite history.
 */
export function stagePatch(stage: Stage, current: Connect, today = dayKey()): StagePatch {
  const patch: StagePatch = { stage };
  switch (stage) {
    case "accepted":
      patch.accepted_on = current.accepted_on ?? today;
      break;
    case "messaged":
      patch.accepted_on = current.accepted_on ?? today;
      patch.messaged_on = current.messaged_on ?? today;
      patch.last_touch_on = current.last_touch_on ?? today;
      break;
    case "replied":
      patch.replied_on = current.replied_on ?? today;
      break;
    case "lead":
      patch.lead_on = current.lead_on ?? today;
      break;
  }
  return patch;
}

/** Logging a follow-up resets the clock rather than changing stage. */
export function followUpPatch(current: Connect, today = dayKey()): StagePatch {
  return {
    followups: Math.min(current.followups + 1, MAX_FOLLOWUPS),
    last_touch_on: today,
  };
}

/** The patch that completes an action in one click. */
export function completionPatch(
  action: Action,
  current: Connect,
  today = dayKey()
): StagePatch {
  if (action.kind === "pitch") return stagePatch("messaged", current, today);
  if (action.kind === "followup") return followUpPatch(current, today);
  return stagePatch("lead", current, today);
}

export type Funnel = {
  sent: number;
  accepted: number;
  messaged: number;
  replied: number;
  leads: number;
};

/**
 * Counts are cumulative: someone at `lead` was also accepted, messaged and
 * replied, so each step counts everyone who reached it *or past it*.
 */
export function funnel(connects: Connect[]): Funnel {
  const f: Funnel = { sent: 0, accepted: 0, messaged: 0, replied: 0, leads: 0 };
  for (const c of connects) {
    f.sent += 1;
    if (c.accepted_on || reached(c.stage, "accepted")) f.accepted += 1;
    if (c.messaged_on || reached(c.stage, "messaged")) f.messaged += 1;
    if (c.replied_on || reached(c.stage, "replied")) f.replied += 1;
    if (c.stage === "lead") f.leads += 1;
  }
  return f;
}

const ORDER: Stage[] = ["pending", "accepted", "messaged", "replied", "lead"];

/** Has this connect got at least as far as `target`? `closed` never has. */
function reached(stage: Stage, target: Stage): boolean {
  if (stage === "closed") return false;
  return ORDER.indexOf(stage) >= ORDER.indexOf(target);
}

export function rate(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}
