import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The one Supabase client, shared by both sections of the app. Two `createClient`
 * calls would mean two connection pools and two realtime sockets for the same
 * project, so every store goes through here.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase renamed the client-side credential: `anon` keys are now "publishable"
// keys (sb_publishable_…). Both are read directly rather than through a variable
// so Next.js can inline them into the browser bundle at build time.
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(URL && KEY);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) client = createClient(URL!, KEY!, { auth: { persistSession: false } });
  return client;
}

export type StoreMode = "supabase" | "local";

/** With no credentials configured the whole app runs on browser localStorage. */
export const storeMode: StoreMode = hasSupabase ? "supabase" : "local";

/** crypto.randomUUID() is missing outside secure contexts; fall back rather than throw. */
export function newId(): string {
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
