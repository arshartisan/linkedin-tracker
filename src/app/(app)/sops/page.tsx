"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, DownloadIcon, PencilIcon, PlusIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { DraftStatus } from "@/components/DraftStatus";
import { RichEditor } from "@/components/RichEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chip, EmptyState, Page, PageHeader } from "@/components/ui/layout";
import * as Select from "@/components/ui/select";
import { dayKey, formatShort, formatTime, relativeDay } from "@/lib/date";
import { EMPTY_SOP, SOP_CATEGORY_LABEL, SOP_TITLE_MAX, sopPlainText, type Sop, type SopCategory, type SopDetails } from "@/lib/sop";
import { downloadSopPdf } from "@/lib/sop-pdf";
import { sopStore } from "@/lib/sop-store";
import { draftKey, useFormDraft, useHasDraft } from "@/hooks/use-form-draft";
import { USER_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

/* `view` reads the selected SOP; `edit` changes it; `new` drafts one that doesn't exist yet. */
type Mode = "view" | "edit" | "new";

function edited(iso: string): string {
  const day = dayKey(new Date(iso));
  return `${relativeDay(day) ?? formatShort(day)}, ${formatTime(iso)}`;
}

function sameDetails(a: SopDetails, b: SopDetails): boolean {
  return a.title === b.title && a.category === b.category && a.content === b.content;
}

export default function SopsPage() {
  const { me, mode: storage } = useData();
  const [rows, setRows] = useState<Sop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState<SopDetails>(EMPTY_SOP);
  // The version the editor opened, so a save can tell if a teammate got there first.
  const [base, setBase] = useState<Sop | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // An action waiting on "discard unsaved changes?", run only if confirmed.
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SopCategory | "all">("all");
  // Phones show one pane at a time; this is whether the document pane has been opened.
  const [reading, setReading] = useState(false);
  // The editor is seeded once at mount, so restoring or discarding a draft remounts it.
  const [editorEpoch, setEditorEpoch] = useState(0);

  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const editing = mode !== "view";
  // A new SOP is kept as a draft on this device until it's created, so leaving
  // it loses nothing. Only edits to an existing SOP can be lost.
  const dirty = mode === "edit" && base !== null && !sameDetails(draft, base);
  const sopDraft = useFormDraft({
    key: mode === "new" ? draftKey(me.id, "sop") : null,
    value: draft,
    empty: EMPTY_SOP,
    restore: (saved) => { setDraft(saved); setEditorEpoch((epoch) => epoch + 1); },
  });
  const hasSopDraft = useHasDraft(draftKey(me.id, "sop"));

  useEffect(() => {
    let cancelled = false;
    sopStore.list().then((data) => { if (!cancelled) { setRows(data); setSelectedId((id) => id ?? data[0]?.id ?? null); } })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Closing the tab mid-edit is the one exit the in-page prompt cannot catch.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function guard(action: () => void) {
    if (dirty) setPending(() => action);
    else action();
  }
  function closeEditor() {
    setMode("view"); setBase(null); setSaveError(null); setPending(null);
  }
  function open(id: string) {
    guard(() => { closeEditor(); setSelectedId(id); setDeleting(false); setReading(true); });
  }
  function startNew() {
    guard(() => {
      setDraft(EMPTY_SOP); setBase(null); setSaveError(null); setPending(null); setDeleting(false);
      setMode("new");
    });
  }
  function startEdit(sop: Sop) {
    setDraft({ title: sop.title, category: sop.category, content: sop.content });
    setBase(sop); setSaveError(null); setDeleting(false);
    setMode("edit");
  }

  async function refresh() {
    setLoading(true); setError(null);
    try {
      const data = await sopStore.list();
      setRows(data);
      if (selectedId && !data.some((row) => row.id === selectedId)) setSelectedId(data[0]?.id ?? null);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load SOPs."); }
    finally { setLoading(false); }
  }
  async function save() {
    setSaving(true); setSaveError(null);
    try {
      const row = await sopStore.save(draft, me.id, base ?? undefined);
      if (mode === "new") sopDraft.clear();
      setRows((previous) => [row, ...previous.filter((item) => item.id !== row.id)]);
      setSelectedId(row.id);
      closeEditor();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this SOP.");
    } finally { setSaving(false); }
  }
  async function remove(id: string) {
    setBusy(true); setError(null);
    try {
      await sopStore.remove(id);
      const remaining = rows.filter((row) => row.id !== id);
      setRows(remaining); setSelectedId(remaining[0]?.id ?? null); setDeleting(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not delete this SOP."); }
    finally { setBusy(false); }
  }

  async function downloadPdf(sop: Sop) {
    setExporting(true); setError(null);
    try { await downloadSopPdf(sop); }
    catch (err) { setError(err instanceof Error ? `Could not create the PDF: ${err.message}` : "Could not create the PDF."); }
    finally { setExporting(false); }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => (category === "all" || row.category === category) &&
      (!query || [row.title, sopPlainText(row.content), USER_LABEL[row.owner]].some((value) => value.toLowerCase().includes(query))));
  }, [rows, search, category]);

  // On phones the list and the document take turns; on wide screens they sit side by side.
  const showingDocument = editing || (reading && selected !== null);

  return <Page>
    <PageHeader title="SOPs" lead="The team's standard operating procedures. Everyone can read and edit them."
      actions={<><Chip>{rows.length} SOP{rows.length === 1 ? "" : "s"}</Chip><Button disabled={loading || Boolean(error) || mode === "new"} onClick={startNew}><PlusIcon />{hasSopDraft && mode !== "new" ? "Resume draft" : "New SOP"}</Button></>} />
    <div className="flex flex-col gap-4">
      {storage === "local" && <p className="text-xs text-muted">Saved in this browser. Connect shared storage so the team sees the same SOPs.</p>}
      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border border-line-soft p-4 text-sm text-rose">{error}<Button variant="secondary" size="sm" disabled={loading} onClick={() => void refresh()}>Retry</Button></div>}
      {pending && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border border-line-soft bg-surface p-3 text-xs">
        <span className="text-text">You have unsaved changes. Discard them?</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="destructive" onClick={() => { const action = pending; closeEditor(); action(); }}>Discard</Button>
          <Button size="sm" variant="ghost" onClick={() => setPending(null)}>Keep editing</Button>
        </div>
      </div>}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section aria-label="SOP list" className={cn("flex min-h-0 flex-col overflow-hidden rounded-card border border-line-soft lg:sticky lg:top-[calc(var(--topbar-h,0px)+16px)] lg:max-h-[calc(100dvh-var(--topbar-h,0px)-32px)]", showingDocument && "max-lg:hidden")}>
          <div className="flex flex-col gap-2 border-b border-line-soft p-3">
            <div className="relative"><SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" /><Input className="h-9 bg-well pl-8 text-xs md:text-xs" aria-label="Search SOPs" placeholder="Search titles and content…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <div className="flex gap-2">
              <Select.Root value={category} onValueChange={(value) => setCategory(value as SopCategory | "all")}><Select.Trigger aria-label="Filter by category" className="flex-1"><Select.Value /></Select.Trigger><Select.Content><Select.Item value="all">All categories</Select.Item>{(Object.keys(SOP_CATEGORY_LABEL) as SopCategory[]).map((value) => <Select.Item key={value} value={value}>{SOP_CATEGORY_LABEL[value]}</Select.Item>)}</Select.Content></Select.Root>
              <Button variant="ghost" size="icon" aria-label="Refresh SOPs" disabled={loading || editing || busy} onClick={() => void refresh()}><RefreshCwIcon /></Button>
            </div>
          </div>
          {loading ? <p role="status" className="p-6 text-sm text-muted">Loading SOPs…</p>
            : error && !rows.length ? <p className="p-6 text-sm text-muted">SOPs could not be loaded. Retry to continue.</p>
            : !filtered.length ? <p className="p-6 text-sm text-muted">{rows.length ? "No SOPs match. Try another search or category." : "No SOPs yet."}</p>
            : <ul className="flex-1 overflow-y-auto p-1.5">{filtered.map((row) => {
              const active = row.id === selectedId && mode !== "new";
              const excerpt = sopPlainText(row.content);
              return <li key={row.id}>
                <button type="button" onClick={() => open(row.id)} aria-current={active ? "true" : undefined}
                  className={cn("w-full rounded-well px-3 py-2.5 text-left transition-colors duration-150", active ? "bg-surface-2 shadow-raised" : "hover:bg-white/4")}>
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{row.title}</span>
                    <span className="shrink-0 text-[11px] text-muted">{SOP_CATEGORY_LABEL[row.category]}</span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-muted">{excerpt || "Empty"}</span>
                  <span className="mt-1.5 block text-[11px] text-muted/75">{USER_LABEL[row.updated_by]} · {edited(row.updated_at)}</span>
                </button>
              </li>;
            })}</ul>}
        </section>

        <section aria-label={editing ? "SOP editor" : "SOP"} className={cn("min-w-0 rounded-card border border-line-soft", !showingDocument && "max-lg:hidden")}>
          {editing ? <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <div className="flex flex-wrap items-center gap-2 border-b border-line-soft p-3">
              <Input required autoFocus={mode === "new"} maxLength={SOP_TITLE_MAX} aria-label="SOP title" placeholder="SOP title" value={draft.title}
                onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
                className="h-9 min-w-0 flex-1 basis-60 bg-well text-sm font-medium md:text-sm" />
              <Select.Root value={draft.category} onValueChange={(value) => setDraft((previous) => ({ ...previous, category: value as SopCategory }))}><Select.Trigger aria-label="Category" className="w-36"><Select.Value /></Select.Trigger><Select.Content>{(Object.keys(SOP_CATEGORY_LABEL) as SopCategory[]).map((value) => <Select.Item key={value} value={value}>{SOP_CATEGORY_LABEL[value]}</Select.Item>)}</Select.Content></Select.Root>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" disabled={saving} onClick={() => guard(closeEditor)}>Cancel</Button>
                <Button type="submit" disabled={saving || !draft.title.trim() || (mode === "edit" && !dirty)}>{saving ? "Saving…" : mode === "new" ? "Create SOP" : "Save changes"}</Button>
              </div>
            </div>
            {mode === "new" && <DraftStatus dirty={sopDraft.dirty} restoredAt={sopDraft.restoredAt} onDiscard={sopDraft.discard} className="border-b border-line-soft px-4 py-2" />}
            {saveError && <p role="alert" className="border-b border-line-soft bg-rose-soft/40 px-4 py-2.5 text-xs text-rose">{saveError}</p>}
            <RichEditor key={base ? `${base.id}:${base.updated_at}` : `new:${editorEpoch}`} label="SOP content" content={draft.content}
              onChange={(content) => setDraft((previous) => ({ ...previous, content }))} />
          </form>
          : selected ? <article>
            <header className="flex flex-wrap items-start gap-3 border-b border-line-soft p-4 sm:px-6">
              <Button variant="ghost" size="icon-sm" aria-label="Back to SOP list" className="lg:hidden" onClick={() => setReading(false)}><ArrowLeftIcon /></Button>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg leading-tight font-medium break-words">{selected.title}</h2>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <Chip>{SOP_CATEGORY_LABEL[selected.category]}</Chip>
                  <span>Edited by {USER_LABEL[selected.updated_by]} · {edited(selected.updated_at)}</span>
                  {selected.owner !== selected.updated_by && <span>Created by {USER_LABEL[selected.owner]}</span>}
                </p>
              </div>
              <div className="flex gap-1">
                {deleting ? <>
                  <Button variant="ghost" size="sm" disabled={busy} className="text-rose" onClick={() => void remove(selected.id)}>{busy ? "Deleting…" : "Delete SOP"}</Button>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDeleting(false)}>Cancel</Button>
                </> : <>
                  <Button variant="secondary" disabled={exporting} onClick={() => void downloadPdf(selected)}><DownloadIcon />{exporting ? "Preparing…" : "PDF"}</Button>
                  <Button variant="secondary" onClick={() => startEdit(selected)}><PencilIcon />Edit</Button>
                  {selected.owner === me.id && <Button variant="ghost" size="icon" aria-label={`Delete ${selected.title}`} onClick={() => setDeleting(true)}><Trash2Icon /></Button>}
                </>}
              </div>
            </header>
            {selected.content
              ? <RichEditor key={`${selected.id}:${selected.updated_at}`} label={selected.title} content={selected.content} editable={false} />
              : <p className="p-6 text-sm text-muted">This SOP has no content yet. Select Edit to write it.</p>}
          </article>
          : <div className="p-4"><EmptyState title={rows.length ? "Select an SOP" : "Write the team's first SOP"}>{rows.length ? "Choose an SOP from the list to read it." : "Document how the team works so everyone follows the same steps."}</EmptyState></div>}
        </section>
      </div>
    </div>
  </Page>;
}
