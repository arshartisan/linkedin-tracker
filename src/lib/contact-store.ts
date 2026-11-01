import { hasSupabase, supabase } from "./supabase";
import { CONTACT_DUPLICATE_MESSAGE, findContactDuplicate, normalizeContact, type Contact, type ContactDetails } from "./contact";
import type { UserId } from "./types";

const LOCAL_KEY = "reach.contacts.v1";
function readLocal(): Contact[] {
  const raw = window.localStorage.getItem(LOCAL_KEY);
  return raw ? JSON.parse(raw) as Contact[] : [];
}
function remoteError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") return new Error(CONTACT_DUPLICATE_MESSAGE);
  if (error.code === "PGRST205" || error.code === "42P01") return new Error("Contact storage is not set up yet. Apply the contacts SQL migration, then retry.");
  if (error.code === "PGRST116") return new Error("Contact no longer exists. Refresh and try again.");
  return new Error(error.message);
}

export const contactStore = {
  async list(): Promise<Contact[]> {
    if (!hasSupabase) return readLocal().sort((a, b) => b.created_at.localeCompare(a.created_at));
    const { data, error } = await supabase().from("contacts").select("*").order("created_at", { ascending: false });
    if (error) throw remoteError(error);
    return (data ?? []) as Contact[];
  },
  /** `currentEmail` is the stored key of the contact being edited; omit it to add. */
  async save(input: ContactDetails, owner: UserId, currentEmail?: string): Promise<Contact> {
    const details = normalizeContact(input);
    if (!hasSupabase) {
      const rows = readLocal();
      const current = currentEmail ? rows.find((row) => row.email === currentEmail) : undefined;
      if (currentEmail && !current) throw new Error("Contact no longer exists. Refresh and try again.");
      if (findContactDuplicate(rows, details.email, currentEmail)) throw new Error(CONTACT_DUPLICATE_MESSAGE);
      const row: Contact = { ...details, owner: current?.owner ?? owner, created_at: current?.created_at ?? new Date().toISOString() };
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify([row, ...rows.filter((item) => item.email !== currentEmail)]));
      return row;
    }
    // The primary key on email is the real guard; it holds against simultaneous saves too.
    const query = currentEmail
      ? supabase().from("contacts").update(details).eq("email", currentEmail)
      : supabase().from("contacts").insert({ ...details, owner });
    const { data, error } = await query.select().single();
    if (error) throw remoteError(error);
    return data as Contact;
  },
  async remove(email: string): Promise<void> {
    if (!hasSupabase) {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(readLocal().filter((row) => row.email !== email)));
      return;
    }
    const { error } = await supabase().from("contacts").delete().eq("email", email);
    if (error) throw remoteError(error);
  },
};
