import {
  hasSupabase,
  newId,
  storeMode,
  supabase,
  type StoreMode,
} from "./supabase";
import {
  DEFAULT_GOAL,
  USER_IDS,
  USER_LABEL,
  hydrate,
  type Connect,
  type NewConnect,
  type Stage,
  type User,
  type UserId,
} from "./types";
import { dayKey } from "./date";
import { normaliseUrl } from "./linkedin";

// The client, the credential check and the id helper live in ./supabase.
// Re-exported here so existing imports from "@/lib/store" keep working.
export { hasSupabase, storeMode };
export type { StoreMode };

const TABLE = "connects";
const USERS_TABLE = "users";
const LOCAL_KEY = "reach.connects.v1";
const LOCAL_USERS_KEY = "reach.users.v1";

function readLocal(): Connect[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as unknown[]).map((r) => hydrate(r as never)) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: Connect[]) {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

function readLocalUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
}

async function readRemoteUsers(): Promise<User[]> {
  const { data, error } = await supabase().from(USERS_TABLE).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as User[];
}

function buildRow(input: NewConnect): Connect {
  const now = new Date();
  return {
    id: newId(),
    sent_on: input.sent_on ?? dayKey(now),
    created_at: now.toISOString(),
    profile_url: normaliseUrl(input.profile_url),
    owner: input.owner,
    name: input.name.trim(),
    stage: "pending",
    note: input.note?.trim() ?? "",
    tags: input.tags ?? [],
    accepted_on: null,
    messaged_on: null,
    replied_on: null,
    lead_on: null,
    last_touch_on: null,
    followups: 0,
  };
}

/**
 * What the unique index on `profile_slug` means in human terms. Exported so the
 * form can recognise it and render it in the duplicate panel rather than as a
 * generic error string.
 */
export const DUPLICATE_MESSAGE =
  "Someone on the team has already connected with this profile.";

export type ConnectPatch = Partial<
  Pick<
    Connect,
    | "name"
    | "stage"
    | "note"
    | "tags"
    | "accepted_on"
    | "messaged_on"
    | "replied_on"
    | "lead_on"
    | "last_touch_on"
    | "followups"
  >
>;

export const store = {
  async list(): Promise<Connect[]> {
    if (!hasSupabase) {
      return readLocal().sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    const { data, error } = await supabase()
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => hydrate(r as never));
  },

  async add(input: NewConnect): Promise<Connect> {
    const row = buildRow(input);
    if (!hasSupabase) {
      writeLocal([row, ...readLocal()]);
      return row;
    }
    const { data, error } = await supabase().from(TABLE).insert(row).select().single();
    if (error) {
      // 23505 is the unique index on profile_slug: someone on the team logged
      // this person between the form's check and this insert. Say so plainly
      // rather than leaking a constraint name.
      if (error.code === "23505") throw new Error(DUPLICATE_MESSAGE);
      throw new Error(error.message);
    }
    return hydrate(data as never);
  },

  async update(id: string, patch: ConnectPatch): Promise<void> {
    if (!hasSupabase) {
      writeLocal(readLocal().map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return;
    }
    const { error } = await supabase().from(TABLE).update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    if (!hasSupabase) {
      writeLocal(readLocal().filter((r) => r.id !== id));
      return;
    }
    const { error } = await supabase().from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  /**
   * The three team members and their daily targets. Always returns all three in
   * display order, filling in anyone the table is missing, so the UI never has
   * to cope with a partial roster.
   */
  async listUsers(): Promise<User[]> {
    const stored = hasSupabase ? await readRemoteUsers() : readLocalUsers();
    const byId = new Map(stored.map((u) => [u.id, u]));
    return USER_IDS.map(
      (id) => byId.get(id) ?? { id, name: USER_LABEL[id], daily_goal: DEFAULT_GOAL }
    );
  },

  async setGoal(id: UserId, daily_goal: number): Promise<void> {
    if (!hasSupabase) {
      const rows = readLocalUsers();
      const next = USER_IDS.map((userId) => {
        const existing = rows.find((u) => u.id === userId);
        const base = existing ?? {
          id: userId,
          name: USER_LABEL[userId],
          daily_goal: DEFAULT_GOAL,
        };
        return userId === id ? { ...base, daily_goal } : base;
      });
      window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(next));
      return;
    }
    // Upsert rather than update: the row exists after the migration, but this
    // also covers a fresh table where the seed insert hasn't run.
    const { error } = await supabase()
      .from(USERS_TABLE)
      .upsert({ id, name: USER_LABEL[id], daily_goal });
    if (error) throw new Error(error.message);
  },
};

export type { Connect, NewConnect, Stage, User, UserId };
