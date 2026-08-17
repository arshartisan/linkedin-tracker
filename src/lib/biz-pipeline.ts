import { dayKey, shiftDayKey } from "./date";
import { isReachable, type BizStage, type Business, type BusinessPatch } from "./biz";
import { diffDays } from "./pipeline";

/** Two follow-ups, then the thread is done - chasing past that is noise. */
export const MAX_BIZ_FOLLOWUPS = 2;

/**
 * Days of silence before the next follow-up is due. Shorter than a LinkedIn
 * thread's would be: a WhatsApp to a shop either gets read that afternoon or
 * gets buried under the day's customer messages by tomorrow.
 */
export const BIZ_FOLLOWUP_GAP_DAYS = 3;

/** Silence after the last follow-up before the queue suggests closing it out. */
export const BIZ_STALE_AFTER_DAYS = 7;

export type BizActionKind = "research" | "pitch" | "followup" | "qualify";

export type BizAction = {
  kind: BizActionKind;
  /** Day this became (or becomes) actionable. */
  dueOn: string;
  /** Days past due; 0 means due today, negative means it's still upcoming. */
  overdue: number;
  label: string;
  /** Copy for the button that completes the action. */
  cta: string;
};

/** The single next thing to do for one business. */
export function nextBizAction(b: Business, today: string = dayKey()): BizAction | null {
  const daysLate = (due: string) => diffDays(due, today);

  switch (b.stage) {
    case "found": {
      const dueOn = b.found_on;
      return {
        kind: "research",
        dueOn,
        overdue: daysLate(dueOn),
        label: "Find their WhatsApp",
        cta: "Save number",
      };
    }
    case "researched": {
      const dueOn = b.researched_on ?? b.found_on;
      return {
        kind: "pitch",
        dueOn,
        overdue: daysLate(dueOn),
        label: "Send the opener",
        cta: "Sent",
      };
    }
    case "contacted": {
      if (b.followups >= MAX_BIZ_FOLLOWUPS) return null;
      const from = b.last_touch_on ?? b.contacted_on ?? b.found_on;
      const dueOn = shiftDayKey(from, BIZ_FOLLOWUP_GAP_DAYS);
      return {
        kind: "followup",
        dueOn,
        overdue: daysLate(dueOn),
        label: `Follow-up ${b.followups + 1} of ${MAX_BIZ_FOLLOWUPS}`,
        cta: `Sent follow-up ${b.followups + 1}`,
      };
    }
    case "replied": {
      const dueOn = b.replied_on ?? b.found_on;
      return {
        kind: "qualify",
        dueOn,
        overdue: daysLate(dueOn),
        label: "They replied - qualify",
        cta: "Mark as lead",
      };
    }
    default:
      return null;
  }
}

/** Both follow-ups spent and still silent - nothing left but to close it. */
export function isBizStale(b: Business, today: string = dayKey()): boolean {
  if (b.stage !== "contacted" || b.followups < MAX_BIZ_FOLLOWUPS) return false;
  const from = b.last_touch_on ?? b.contacted_on ?? b.found_on;
  return diffDays(from, today) >= BIZ_STALE_AFTER_DAYS;
}

export type BizQueue = {
  /**
   * Still at `found`. Its own lane rather than mixed into `due`, because
   * research is bulk work - you sit down and dig out ten numbers in a stretch -
   * where messaging is one-at-a-time. Oldest first, so nothing rots at the
   * bottom of a growing list.
   */
  research: Business[];
  /** Openers, follow-ups and replies that are actionable now, most overdue first. */
  due: { business: Business; action: BizAction }[];
  /** Follow-ups with a date in the future. */
  upcoming: { business: Business; action: BizAction }[];
  /** Went quiet after both follow-ups. */
  stale: Business[];
  leads: Business[];
  /** Researched, and there is no number to be found. Parked, not deleted. */
  unreachable: Business[];
};

/** One pass over every business produces every bucket the section needs. */
export function buildBizQueue(rows: Business[], today: string = dayKey()): BizQueue {
  const queue: BizQueue = {
    research: [],
    due: [],
    upcoming: [],
    stale: [],
    leads: [],
    unreachable: [],
  };

  for (const business of rows) {
    if (business.stage === "lead") {
      queue.leads.push(business);
      continue;
    }
    if (business.stage === "unreachable") {
      queue.unreachable.push(business);
      continue;
    }
    if (business.stage === "found") {
      queue.research.push(business);
      continue;
    }
    if (isBizStale(business, today)) {
      queue.stale.push(business);
      continue;
    }
    const action = nextBizAction(business, today);
    if (!action) continue;
    (action.overdue >= 0 ? queue.due : queue.upcoming).push({ business, action });
  }

  queue.research.sort((a, b) => a.found_on.localeCompare(b.found_on));
  // Most overdue first - the oldest debt is the most likely to go cold.
  queue.due.sort((a, b) => b.action.overdue - a.action.overdue);
  queue.upcoming.sort((a, b) => a.action.dueOn.localeCompare(b.action.dueOn));
  queue.leads.sort((a, b) => (b.lead_on ?? "").localeCompare(a.lead_on ?? ""));

  return queue;
}

/**
 * Moving to a stage also stamps the day it happened, so follow-up timing and
 * the funnel work without a separate bookkeeping step. Already-set stamps are
 * kept - going back and forth shouldn't rewrite history.
 */
export function bizStagePatch(
  stage: BizStage,
  current: Business,
  today = dayKey()
): BusinessPatch {
  const patch: BusinessPatch = { stage };
  switch (stage) {
    case "researched":
      patch.researched_on = current.researched_on ?? today;
      break;
    case "contacted":
      patch.researched_on = current.researched_on ?? today;
      patch.contacted_on = current.contacted_on ?? today;
      patch.last_touch_on = current.last_touch_on ?? today;
      break;
    case "replied":
      patch.replied_on = current.replied_on ?? today;
      break;
    case "lead":
      patch.lead_on = current.lead_on ?? today;
      break;
    case "unreachable":
      // Reaching this stage *is* the research being finished, so it stamps the
      // same day - the work happened even though it turned up nothing.
      patch.researched_on = current.researched_on ?? today;
      break;
  }
  return patch;
}

/** Logging a follow-up resets the clock rather than changing stage. */
export function bizFollowUpPatch(current: Business, today = dayKey()): BusinessPatch {
  return {
    followups: Math.min(current.followups + 1, MAX_BIZ_FOLLOWUPS),
    last_touch_on: today,
  };
}

/**
 * The patch that completes an action in one click.
 *
 * `research` is the one that can fail: with no number saved there is nothing to
 * message, so it lands on `unreachable` instead of `researched`. The queue only
 * offers the button once a number is in, but a stale render shouldn't be able
 * to push a contactless row into the messaging lane.
 */
export function bizCompletionPatch(
  action: BizAction,
  current: Business,
  today = dayKey()
): BusinessPatch {
  switch (action.kind) {
    case "research":
      return bizStagePatch(
        isReachable(current) ? "researched" : "unreachable",
        current,
        today
      );
    case "pitch":
      return bizStagePatch("contacted", current, today);
    case "followup":
      return bizFollowUpPatch(current, today);
    case "qualify":
      return bizStagePatch("lead", current, today);
  }
}

export type BizFunnel = {
  found: number;
  researched: number;
  contacted: number;
  replied: number;
  leads: number;
};

/**
 * Counts are cumulative: a business at `lead` was also researched, contacted
 * and replied, so each step counts everyone who reached it *or past it*.
 */
export function bizFunnel(rows: Business[]): BizFunnel {
  const f: BizFunnel = { found: 0, researched: 0, contacted: 0, replied: 0, leads: 0 };
  for (const b of rows) {
    f.found += 1;
    if (b.researched_on || reached(b.stage, "researched")) f.researched += 1;
    if (b.contacted_on || reached(b.stage, "contacted")) f.contacted += 1;
    if (b.replied_on || reached(b.stage, "replied")) f.replied += 1;
    if (b.stage === "lead") f.leads += 1;
  }
  return f;
}

const ORDER: BizStage[] = ["found", "researched", "contacted", "replied", "lead"];

/** Has this business got at least as far as `target`? The dead ends never have. */
function reached(stage: BizStage, target: BizStage): boolean {
  if (stage === "closed" || stage === "unreachable") return false;
  return ORDER.indexOf(stage) >= ORDER.indexOf(target);
}

export { rate } from "./pipeline";
