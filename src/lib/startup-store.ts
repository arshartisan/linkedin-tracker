import { hasSupabase, newId, supabase } from "./supabase";
import { findStartupDuplicate, normalizeStartup, STARTUP_DUPLICATE_MESSAGE, type Startup, type StartupDetails } from "./startup";
import type { UserId } from "./types";

const LOCAL_KEY = "reach.startups.v1";
function readLocal(): Startup[] {
  const raw = window.localStorage.getItem(LOCAL_KEY);
  return raw ? JSON.parse(raw) as Startup[] : [];
}
function remoteError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") return new Error(STARTUP_DUPLICATE_MESSAGE);
  if (error.code === "PGRST205" || error.code === "42P01") return new Error("Startup storage is not set up yet. Apply the startups SQL migration, then retry.");
  return new Error(error.message);
}

export const startupStore = {
  async list(): Promise<Startup[]> {
    if (!hasSupabase) return readLocal().sort((a, b) => b.created_at.localeCompare(a.created_at));
    const { data, error } = await supabase().from("startups").select("*").order("created_at", { ascending: false });
    if (error) throw remoteError(error);
    return (data ?? []) as Startup[];
  },
  async save(input: StartupDetails, owner: UserId, id?: string): Promise<Startup> {
    const details = normalizeStartup(input);
    const existing = await startupStore.list();
    const current = id ? existing.find((row) => row.id === id) : undefined;
    if (id && !current) throw new Error("Startup no longer exists. Refresh and try again.");
    if (findStartupDuplicate(existing, details, id)) throw new Error(STARTUP_DUPLICATE_MESSAGE);
    const row: Startup = { ...details, id: id ?? newId(), owner: current?.owner ?? owner, created_at: current?.created_at ?? new Date().toISOString() };
    if (!hasSupabase) {
      // Re-read after the async preflight so same-tab saves cannot overwrite each other.
      const rows = readLocal();
      if (findStartupDuplicate(rows, details, id)) throw new Error(STARTUP_DUPLICATE_MESSAGE);
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify([row, ...rows.filter((item) => item.id !== row.id)]));
      return row;
    }
    const query = id
      ? supabase().from("startups").update(details).eq("id", id)
      : supabase().from("startups").insert(row);
    const { data, error } = await query.select().single();
    if (error) throw remoteError(error);
    return data as Startup;
  },
  async remove(id: string): Promise<void> {
    if (!hasSupabase) {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(readLocal().filter((row) => row.id !== id)));
      return;
    }
    const { error } = await supabase().from("startups").delete().eq("id", id);
    if (error) throw remoteError(error);
  },
};
