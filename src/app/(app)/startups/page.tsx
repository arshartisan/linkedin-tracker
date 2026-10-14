"use client";

import { useEffect, useMemo, useState } from "react";
import { PencilIcon, PlusIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { StartupForm } from "@/components/StartupForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip, EmptyState, Page, PageHeader } from "@/components/ui/layout";
import * as Select from "@/components/ui/select";
import { startupStore } from "@/lib/startup-store";
import { STARTUP_CHANNEL_LABEL, type Startup, type StartupChannel, type StartupDetails } from "@/lib/startup";
import { USER_LABEL } from "@/lib/types";

const PAGE_SIZE = 10;
function ExternalLink({ url, children }: { url: string; children: React.ReactNode }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-text">{children} ↗</a>;
}

export default function StartupsPage() {
  const { me, mode } = useData();
  const [rows, setRows] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Startup | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("mine");
  const [channel, setChannel] = useState<StartupChannel | "all">("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const myCount = rows.filter((row) => row.owner === me.id).length;

  useEffect(() => {
    let cancelled = false;
    startupStore.list().then((data) => { if (!cancelled) setRows(data); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function refresh() {
    setLoading(true); setError(null);
    try { setRows(await startupStore.list()); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load startups."); }
    finally { setLoading(false); }
  }
  async function save(details: StartupDetails) {
    try {
      const row = await startupStore.save(details, me.id, editor && editor !== "new" ? editor.id : undefined);
      setRows((previous) => [row, ...previous.filter((item) => item.id !== row.id)]);
      setEditor(null);
    } catch (err) {
      // Refresh a concurrent teammate's insert so the duplicate panel can show its owner.
      try { setRows(await startupStore.list()); } catch { /* Preserve the original save error. */ }
      throw err;
    }
  }
  async function remove(id: string) {
    setBusy(true); setError(null);
    try { await startupStore.remove(id); setRows((previous) => previous.filter((row) => row.id !== id)); setDeleting(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not delete startup."); }
    finally { setBusy(false); }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => (scope === "team" || row.owner === me.id) &&
      (channel === "all" || row.outreach_channels.includes(channel)) &&
      [row.name, row.email, row.website_url, row.yc_url, row.linkedin_url, row.facebook_url, row.x_url, row.instagram_url,
        row.note, USER_LABEL[row.owner], ...row.founder_linkedin_urls, ...row.other_social_urls].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : b.created_at.localeCompare(a.created_at));
  }, [rows, me.id, scope, channel, search, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return <Page>
    <PageHeader title="Startups" lead="Track startups, founders, and the ways you have reached them."
      actions={<><Chip>{myCount} startup{myCount === 1 ? "" : "s"}</Chip><Button disabled={loading || Boolean(error)} onClick={() => { setEditor("new"); setDeleting(null); }} aria-expanded={editor !== null} aria-controls="startup-editor"><PlusIcon />Add startup</Button></>} />
    <div className="flex flex-col gap-4">
      {mode === "local" && <p className="text-xs text-muted">Saved in this browser. Connect shared storage to prevent duplicates across team members on different devices.</p>}
      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border border-line-soft p-4 text-sm text-rose">{error}<Button variant="secondary" size="sm" disabled={loading} onClick={() => void refresh()}>Retry</Button></div>}
      {editor && <div id="startup-editor"><StartupForm key={editor === "new" ? "new" : editor.id} startup={editor === "new" ? undefined : editor} rows={rows} onSave={save} onCancel={() => setEditor(null)} /></div>}
      <section aria-label="Tracked startups" className="overflow-hidden rounded-card border border-line-soft">
        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft p-3">
          <div className="relative w-full sm:w-64"><SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" /><Input className="h-9 bg-well pl-8 text-xs md:text-xs" aria-label="Search startups" placeholder="Search startups or founders…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
          <Select.Root value={scope} onValueChange={(value) => { setScope(value); setPage(1); }}><Select.Trigger aria-label="Filter by team member"><Select.Value /></Select.Trigger><Select.Content><Select.Item value="mine">My startups</Select.Item><Select.Item value="team">All team startups</Select.Item></Select.Content></Select.Root>
          <Select.Root value={channel} onValueChange={(value) => { setChannel(value as StartupChannel | "all"); setPage(1); }}><Select.Trigger aria-label="Filter by contact method"><Select.Value /></Select.Trigger><Select.Content><Select.Item value="all">All contact methods</Select.Item>{(Object.keys(STARTUP_CHANNEL_LABEL) as StartupChannel[]).map((value) => <Select.Item key={value} value={value}>{STARTUP_CHANNEL_LABEL[value]}</Select.Item>)}</Select.Content></Select.Root>
          <Select.Root value={sort} onValueChange={(value) => { setSort(value); setPage(1); }}><Select.Trigger aria-label="Sort startups" className="sm:ml-auto"><Select.Value /></Select.Trigger><Select.Content><Select.Item value="newest">Newest first</Select.Item><Select.Item value="name">Name A–Z</Select.Item></Select.Content></Select.Root>
          <Button variant="ghost" size="icon-sm" aria-label="Refresh startups" disabled={loading || editor !== null || busy} onClick={() => void refresh()}><RefreshCwIcon /></Button>
        </div>
        {loading ? <p role="status" className="p-6 text-sm text-muted">Loading startups…</p> : error && !rows.length ? <p className="p-6 text-sm text-muted">Startups could not be loaded. Retry to continue.</p> : !filtered.length ? <div className="p-4"><EmptyState title={rows.length ? "No matching startups" : "Your startup pipeline starts here"}>{rows.length ? "Try another search, team view, or contact method." : "Add a startup to track its founders, contacts, and outreach."}</EmptyState></div> :
          <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-xs">
            <caption className="sr-only">Startups with founders, contact links, contact methods, and team owners</caption>
            <thead className="border-b border-line-soft bg-well text-muted"><tr>{["Startup", "Founders", "Contact & social links", "Reached through", "Added by", "Actions"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-normal">{label}</th>)}</tr></thead>
            <tbody>{visible.map((row) => <tr key={row.id} className="border-b border-line-soft last:border-b-0 hover:bg-surface/60">
              <td className="px-4 py-3 align-top"><p className="max-w-60 truncate text-[13px] font-medium" title={row.name}>{row.name}</p><div className="mt-2 flex flex-wrap gap-3">{row.website_url && <ExternalLink url={row.website_url}>Website</ExternalLink>}{row.yc_url && <ExternalLink url={row.yc_url}>YC</ExternalLink>}</div>{row.note && <p className="mt-2 max-w-60 truncate text-muted" title={row.note}>{row.note}</p>}</td>
              <td className="px-4 py-3 align-top"><div className="flex flex-col gap-2">{row.founder_linkedin_urls.map((url, index) => <ExternalLink key={url} url={url}>{url.split("/").pop() || `Founder ${index + 1}`}</ExternalLink>)}{!row.founder_linkedin_urls.length && <span className="text-muted">—</span>}</div></td>
              <td className="px-4 py-3 align-top">{row.email && <a href={`mailto:${row.email}`} className="mb-2 block max-w-60 truncate text-muted hover:text-text" title={row.email}>{row.email}</a>}<div className="flex max-w-64 flex-wrap gap-x-3 gap-y-2">{([["LinkedIn", row.linkedin_url], ["Facebook", row.facebook_url], ["X", row.x_url], ["Instagram", row.instagram_url]] as const).filter(([, url]) => url).map(([label, url]) => <ExternalLink key={label} url={url}>{label}</ExternalLink>)}{row.other_social_urls.map((url, index) => <ExternalLink key={url} url={url}>Social {index + 1}</ExternalLink>)}</div>{![row.email, row.linkedin_url, row.facebook_url, row.x_url, row.instagram_url, ...row.other_social_urls].some(Boolean) && <span className="text-muted">—</span>}</td>
              <td className="px-4 py-3 align-top"><div className="flex max-w-48 flex-wrap gap-1">{row.outreach_channels.map((value) => <Chip key={value} tone="brand">{STARTUP_CHANNEL_LABEL[value]}</Chip>)}{!row.outreach_channels.length && <span className="text-muted">Not contacted</span>}</div></td>
              <td className="whitespace-nowrap px-4 py-3 align-top text-muted">{USER_LABEL[row.owner]}<p className="mt-1 text-[11px]">{row.created_at.slice(0, 10)}</p></td>
              <td className="px-4 py-3 align-top">{row.owner === me.id && <div className="flex justify-end gap-1">{deleting === row.id ? <><Button variant="ghost" size="xs" disabled={busy} className="text-rose" onClick={() => void remove(row.id)}>{busy ? "Deleting…" : "Delete"}</Button><Button variant="ghost" size="xs" disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button></> : <><Button variant="ghost" size="icon-sm" aria-label={`Edit ${row.name}`} onClick={() => { setEditor(row); setDeleting(null); }}><PencilIcon /></Button><Button variant="ghost" size="icon-sm" aria-label={`Delete ${row.name}`} onClick={() => setDeleting(row.id)}><Trash2Icon /></Button></>}</div>}</td>
            </tr>)}</tbody>
          </table></div>}
        <div className="flex items-center justify-between gap-3 border-t border-line-soft px-4 py-3 text-xs text-muted"><p aria-live="polite">{filtered.length} startup{filtered.length === 1 ? "" : "s"}</p><nav aria-label="Startup pagination" className="flex items-center gap-2"><Button variant="ghost" size="sm" disabled={currentPage === 1 || loading} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>{currentPage} / {pageCount}</span><Button variant="ghost" size="sm" disabled={currentPage === pageCount || loading} onClick={() => setPage(currentPage + 1)}>Next</Button></nav></div>
      </section>
    </div>
  </Page>;
}
