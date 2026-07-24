/**
 * A connect moves through one pipeline, in one direction:
 *
 *   pending → accepted → messaged → replied → lead
 *                            ↓         ↓
 *                          closed ← ───┘
 *
 * `pending`  invite sent, waiting for them to accept
 * `accepted` they accepted — the pitch still needs sending
 * `messaged` pitch sent, waiting on a reply (up to 2 follow-ups live here)
 * `replied`  they wrote back — qualify them
 * `lead`     turned into real business
 * `closed`   dead: ignored the invite, or went quiet after both follow-ups
 */
export type Stage =
  | "pending"
  | "accepted"
  | "messaged"
  | "replied"
  | "lead"
  | "closed";

export type Connect = {
  id: string;
  /** Local calendar day the connect was sent, as YYYY-MM-DD. */
  sent_on: string;
  created_at: string;
  profile_url: string;
  name: string;
  stage: Stage;
  note: string;
  tags: string[];
  /** Day each milestone landed — null until the stage is reached. */
  accepted_on: string | null;
  messaged_on: string | null;
  replied_on: string | null;
  lead_on: string | null;
  /** Day of the last thing *you* sent. This is what makes a follow-up due. */
  last_touch_on: string | null;
  /** How many follow-ups have gone out, 0–2. */
  followups: number;
};

export type NewConnect = {
  profile_url: string;
  name: string;
  note?: string;
  tags?: string[];
  sent_on?: string;
};

export const STAGES: Stage[] = [
  "pending",
  "accepted",
  "messaged",
  "replied",
  "lead",
  "closed",
];

export const STAGE_LABEL: Record<Stage, string> = {
  pending: "Pending",
  accepted: "Accepted",
  messaged: "Messaged",
  replied: "Replied",
  lead: "Lead",
  closed: "Closed",
};

/** Short forms for the tight chip row on a card. */
export const STAGE_SHORT: Record<Stage, string> = {
  pending: "Sent",
  accepted: "Accept",
  messaged: "Msg",
  replied: "Reply",
  lead: "Lead",
  closed: "Closed",
};

/**
 * One hue, climbing. The pipeline is a ladder, so the chip gets brighter the
 * further along it is — grey while nothing has happened, dim lime once they're
 * engaged, full lime on a reply, and solid lime only for a lead. `closed` is
 * the one stage that leaves the ramp, because it is the one that isn't progress.
 */
export const STAGE_TONE: Record<Stage, string> = {
  pending: "bg-surface-2 text-muted",
  accepted: "bg-surface-2 text-brand-dim",
  messaged: "bg-brand-soft text-brand-dim",
  replied: "bg-brand-soft text-brand",
  lead: "bg-brand text-ink",
  closed: "bg-rose-soft text-rose",
};

/** Stages where the thread is still alive and worth counting as in-flight. */
export const OPEN_STAGES: Stage[] = ["pending", "accepted", "messaged", "replied"];

const LEGACY_STAGE: Record<string, Stage> = {
  pending: "pending",
  accepted: "accepted",
  ignored: "closed",
};

/**
 * Rows written before the pipeline existed only have `status`, and rows from
 * any older client may be missing the milestone columns. Everything is read
 * through here so a legacy row renders instead of throwing.
 */
export function hydrate(row: Partial<Connect> & Record<string, unknown>): Connect {
  const legacy = typeof row.status === "string" ? LEGACY_STAGE[row.status] : undefined;
  const stage: Stage =
    row.stage && STAGES.includes(row.stage) ? row.stage : legacy ?? "pending";

  return {
    id: String(row.id ?? ""),
    sent_on: String(row.sent_on ?? ""),
    created_at: String(row.created_at ?? ""),
    profile_url: String(row.profile_url ?? ""),
    name: String(row.name ?? ""),
    stage,
    note: String(row.note ?? ""),
    tags: Array.isArray(row.tags) ? row.tags : [],
    accepted_on: row.accepted_on ?? null,
    messaged_on: row.messaged_on ?? null,
    replied_on: row.replied_on ?? null,
    lead_on: row.lead_on ?? null,
    last_touch_on: row.last_touch_on ?? null,
    followups: typeof row.followups === "number" ? row.followups : 0,
  };
}
