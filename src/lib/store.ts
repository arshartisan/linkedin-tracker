import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hydrate, type Connect, type NewConnect, type Stage } from "./types";
import { dayKey } from "./date";
import { normaliseUrl } from "./linkedin";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase renamed the client-side credential: `anon` keys are now "publishable"
// keys (sb_publishable_…). Both are read directly rather than through a variable
// so Next.js can inline them into the browser bundle at build time.
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!client) client = createClient(URL!, KEY!, { auth: { persistSession: false } });
  return client;
}

export type StoreMode = "supabase" | "local";
export const storeMode: StoreMode = hasSupabase ? "supabase" : "local";

const TABLE = "connects";
const LOCAL_KEY = "reach.connects.v1";

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

/** crypto.randomUUID() is missing outside secure contexts; fall back rather than throw. */
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function buildRow(input: NewConnect): Connect {
  const now = new Date();
  return {
    id: newId(),
    sent_on: input.sent_on ?? dayKey(now),
    created_at: now.toISOString(),
    profile_url: normaliseUrl(input.profile_url),
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
    if (error) throw new Error(error.message);
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
};

export type { Connect, NewConnect, Stage };
