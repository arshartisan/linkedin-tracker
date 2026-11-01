"use client";

import { useEffect, useMemo, useState } from "react";
import { PencilIcon, PlusIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { ContactForm } from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip, EmptyState, Page, PageHeader } from "@/components/ui/layout";
import * as Select from "@/components/ui/select";
import { contactStore } from "@/lib/contact-store";
import { draftKey, useHasDraft } from "@/hooks/use-form-draft";
import type { Contact, ContactDetails } from "@/lib/contact";
import { USER_LABEL } from "@/lib/types";

const PAGE_SIZE = 15;

function socialLabel(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Link"; }
}

export default function ContactsPage() {
  const { me, mode } = useData();
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Contact | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("mine");
  const [country, setCountry] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const myCount = rows.filter((row) => row.owner === me.id).length;
  const contactDraft = useHasDraft(draftKey(me.id, "contact"));
  const countries = useMemo(() => [...new Set(rows.map((row) => row.country).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [rows]);

  useEffect(() => {
    let cancelled = false;
    contactStore.list().then((data) => { if (!cancelled) setRows(data); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function refresh() {
    setLoading(true); setError(null);
    try { setRows(await contactStore.list()); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load contacts."); }
    finally { setLoading(false); }
  }
  async function save(details: ContactDetails) {
    const currentEmail = editor && editor !== "new" ? editor.email : undefined;
    try {
      const row = await contactStore.save(details, me.id, currentEmail);
      setRows((previous) => [row, ...previous.filter((item) => item.email !== currentEmail && item.email !== row.email)]);
      setEditor(null);
    } catch (err) {
      // Pick up a teammate's simultaneous insert so the duplicate notice can name its owner.
      try { setRows(await contactStore.list()); } catch { /* Preserve the original save error. */ }
      throw err;
    }
  }
  async function remove(email: string) {
    setBusy(true); setError(null);
    try { await contactStore.remove(email); setRows((previous) => previous.filter((row) => row.email !== email)); setDeleting(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete contact."); }
    finally { setBusy(false); }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => (scope === "team" || row.owner === me.id) &&
      (country === "all" || row.country === country) &&
      [row.name, row.email, row.phone, row.country, row.social_url, USER_LABEL[row.owner]].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : b.created_at.localeCompare(a.created_at));
  }, [rows, me.id, scope, country, search, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return <Page>
    <PageHeader title="Contacts" lead="Common leads from anywhere - one entry per email, shared across the team."
      actions={<><Chip>{myCount} contact{myCount === 1 ? "" : "s"}</Chip><Button disabled={loading || Boolean(error)} onClick={() => { setEditor("new"); setDeleting(null); }} aria-expanded={editor !== null} aria-controls="contact-editor"><PlusIcon />{contactDraft && editor !== "new" ? "Resume draft" : "Add contact"}</Button></>} />
    <div className="flex flex-col gap-4">
      {mode === "local" && <p className="text-xs text-muted">Saved in this browser. Connect shared storage to prevent duplicate emails across team members on different devices.</p>}
      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border border-line-soft p-4 text-sm text-rose">{error}<Button variant="secondary" size="sm" disabled={loading} onClick={() => void refresh()}>Retry</Button></div>}
      {editor && <div id="contact-editor"><ContactForm me={me.id} key={editor === "new" ? "new" : editor.email} contact={editor === "new" ? undefined : editor} rows={rows} onSave={save} onCancel={() => setEditor(null)} /></div>}
      <section aria-label="Saved contacts" className="overflow-hidden rounded-card border border-line-soft">
        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft p-3">
          <div className="relative w-full sm:w-64"><SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" /><Input className="h-9 bg-well pl-8 text-xs md:text-xs" aria-label="Search contacts" placeholder="Search name, email, phone…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
          <Select.Root value={scope} onValueChange={(value) => { setScope(value); setPage(1); }}><Select.Trigger aria-label="Filter by team member"><Select.Value /></Select.Trigger><Select.Content><Select.Item value="mine">My contacts</Select.Item><Select.Item value="team">All team contacts</Select.Item></Select.Content></Select.Root>
          <Select.Root value={country} onValueChange={(value) => { setCountry(value); setPage(1); }}><Select.Trigger aria-label="Filter by country"><Select.Value /></Select.Trigger><Select.Content><Select.Item value="all">All countries</Select.Item>{countries.map((value) => <Select.Item key={value} value={value}>{value}</Select.Item>)}</Select.Content></Select.Root>
          <Select.Root value={sort} onValueChange={(value) => { setSort(value); setPage(1); }}><Select.Trigger aria-label="Sort contacts" className="sm:ml-auto"><Select.Value /></Select.Trigger><Select.Content><Select.Item value="newest">Newest first</Select.Item><Select.Item value="name">Name A–Z</Select.Item></Select.Content></Select.Root>
          <Button variant="ghost" size="icon-sm" aria-label="Refresh contacts" disabled={loading || editor !== null || busy} onClick={() => void refresh()}><RefreshCwIcon /></Button>
        </div>
        {loading ? <p role="status" className="p-6 text-sm text-muted">Loading contacts…</p> : error && !rows.length ? <p className="p-6 text-sm text-muted">Contacts could not be loaded. Retry to continue.</p> : !filtered.length ? <div className="p-4"><EmptyState title={rows.length ? "No matching contacts" : "Your contact list starts here"}>{rows.length ? "Try another search, team view, or country." : "Add a contact to keep their email, number, and socials in one place."}</EmptyState></div> :
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs">
            <caption className="sr-only">Contacts with email, mobile number, country, social link, and team owner</caption>
            <thead className="border-b border-line-soft bg-well text-muted"><tr>{["Name", "Email", "Mobile", "Country", "Social", "Added by", "Actions"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-normal">{label}</th>)}</tr></thead>
            <tbody>{visible.map((row) => <tr key={row.email} className="border-b border-line-soft last:border-b-0 hover:bg-surface/60">
              <td className="px-4 py-3 align-top"><p className="max-w-48 truncate text-[13px] font-medium" title={row.name}>{row.name}</p></td>
              <td className="px-4 py-3 align-top"><a href={`mailto:${row.email}`} className="block max-w-60 truncate text-muted hover:text-text" title={row.email}>{row.email}</a></td>
              <td className="whitespace-nowrap px-4 py-3 align-top">{row.phone ? <a href={`tel:${row.phone.replace(/[^\d+]/g, "")}`} className="tabular text-muted hover:text-text">{row.phone}</a> : <span className="text-muted">—</span>}</td>
              <td className="px-4 py-3 align-top text-muted">{row.country || "—"}</td>
              <td className="px-4 py-3 align-top">{row.social_url ? <a href={row.social_url} target="_blank" rel="noopener noreferrer" className="block max-w-40 truncate text-muted hover:text-text" title={row.social_url}>{socialLabel(row.social_url)} ↗</a> : <span className="text-muted">—</span>}</td>
              <td className="whitespace-nowrap px-4 py-3 align-top text-muted">{USER_LABEL[row.owner]}<p className="mt-1 text-[11px]">{row.created_at.slice(0, 10)}</p></td>
              <td className="px-4 py-3 align-top">{row.owner === me.id && <div className="flex justify-end gap-1">{deleting === row.email ? <><Button variant="ghost" size="xs" disabled={busy} className="text-rose" onClick={() => void remove(row.email)}>{busy ? "Deleting…" : "Delete"}</Button><Button variant="ghost" size="xs" disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button></> : <><Button variant="ghost" size="icon-sm" aria-label={`Edit ${row.name}`} onClick={() => { setEditor(row); setDeleting(null); }}><PencilIcon /></Button><Button variant="ghost" size="icon-sm" aria-label={`Delete ${row.name}`} onClick={() => setDeleting(row.email)}><Trash2Icon /></Button></>}</div>}</td>
            </tr>)}</tbody>
          </table></div>}
        <div className="flex items-center justify-between gap-3 border-t border-line-soft px-4 py-3 text-xs text-muted"><p aria-live="polite">{filtered.length} contact{filtered.length === 1 ? "" : "s"}</p><nav aria-label="Contact pagination" className="flex items-center gap-2"><Button variant="ghost" size="sm" disabled={currentPage === 1 || loading} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>{currentPage} / {pageCount}</span><Button variant="ghost" size="sm" disabled={currentPage === pageCount || loading} onClick={() => setPage(currentPage + 1)}>Next</Button></nav></div>
      </section>
    </div>
  </Page>;
}
