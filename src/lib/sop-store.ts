import { hasSupabase, newId, supabase } from "./supabase";
import { normalizeSop, SOP_CONFLICT_MESSAGE, type Sop, type SopDetails } from "./sop";
import type { UserId } from "./types";

const LOCAL_KEY = "reach.sops.v1";
function readLocal(): Sop[] {
  const raw = window.localStorage.getItem(LOCAL_KEY);
  return raw ? JSON.parse(raw) as Sop[] : [];
}
function remoteError(error: { code?: string; message: string }): Error {
  if (error.code === "PGRST205" || error.code === "42P01") return new Error("SOP storage is not set up yet. Apply the SOPs SQL migration, then retry.");
  return new Error(error.message);
}
const byRecent = (a: Sop, b: Sop) => b.updated_at.localeCompare(a.updated_at);

export const sopStore = {
  async list(): Promise<Sop[]> {
    if (!hasSupabase) return readLocal().sort(byRecent);
    const { data, error } = await supabase().from("sops").select("*").order("updated_at", { ascending: false });
    if (error) throw remoteError(error);
    return (data ?? []) as Sop[];
  },
  /**
   * `base` is the version the editor opened. An edit only lands if the row is
   * still at that version, so two people editing one SOP cannot silently
   * overwrite each other - the second save is told to reload instead.
   */
  async save(input: SopDetails, editor: UserId, base?: Sop): Promise<Sop> {
    const details = normalizeSop(input);
    const now = new Date().toISOString();
    if (!hasSupabase) {
      const rows = readLocal();
      const current = base && rows.find((row) => row.id === base.id);
      if (base && !current) throw new Error("This SOP no longer exists. It may have been deleted.");
      if (current && current.updated_at !== base!.updated_at) throw new Error(SOP_CONFLICT_MESSAGE);
      const row: Sop = { ...details, id: current?.id ?? newId(), owner: current?.owner ?? editor, created_at: current?.created_at ?? now, updated_at: now, updated_by: editor };
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify([row, ...rows.filter((item) => item.id !== row.id)]));
      return row;
    }
    if (!base) {
      const { data, error } = await supabase().from("sops")
        .insert({ ...details, id: newId(), owner: editor, updated_by: editor })
        .select().single();
      if (error) throw remoteError(error);
      return data as Sop;
    }
    const { data, error } = await supabase().from("sops")
      .update({ ...details, updated_by: editor })
      .eq("id", base.id).eq("updated_at", base.updated_at)
      .select();
    if (error) throw remoteError(error);
    if (!data?.length) {
      const { data: still } = await supabase().from("sops").select("id").eq("id", base.id);
      throw new Error(still?.length ? SOP_CONFLICT_MESSAGE : "This SOP no longer exists. It may have been deleted.");
    }
    return data[0] as Sop;
  },
  async remove(id: string): Promise<void> {
    if (!hasSupabase) {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(readLocal().filter((row) => row.id !== id)));
      return;
    }
    const { error } = await supabase().from("sops").delete().eq("id", id);
    if (error) throw remoteError(error);
  },
};
