"use client";

import { useMemo, useRef, useState } from "react";
import { useData } from "./DataProvider";
import { isLinkedInUrl, nameFromUrl, parseTags } from "@/lib/linkedin";
import { formatShort, relativeDay } from "@/lib/date";

export function AddConnect() {
  const { add, findDuplicate } = useData();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const trimmed = url.trim();
  const valid = isLinkedInUrl(trimmed);
  const duplicate = useMemo(
    () => (valid ? findDuplicate(trimmed) : null),
    [valid, trimmed, findDuplicate]
  );
  const derivedName = valid ? nameFromUrl(trimmed) : "";
  // One profile, one row. Logging the same person twice inflates the tally and
  // quietly breaks the funnel rates, so a duplicate link is a hard stop.
  const blocked = Boolean(duplicate);

  function reset() {
    setUrl("");
    setName("");
    setNote("");
    setTags("");
    setShowDetails(false);
    urlRef.current?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError("That doesn't look like a LinkedIn profile link.");
      return;
    }
    if (blocked) {
      setError("You've already logged this profile.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await add({
        profile_url: trimmed,
        name: name.trim() || derivedName,
        note,
        tags: parseTags(tags),
      });
      reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <input
            ref={urlRef}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder="Paste the LinkedIn profile link"
            aria-label="LinkedIn profile link"
            aria-invalid={blocked || undefined}
            aria-describedby={duplicate ? "duplicate-warning" : undefined}
            autoComplete="off"
            spellCheck={false}
            className={`w-full rounded-xl border bg-ink px-4 py-3.5 pr-24 font-mono text-sm placeholder:font-sans placeholder:text-muted/70 focus:outline-none ${
              blocked
                ? "border-rose focus:border-rose"
                : "border-line-soft focus:border-brand"
            }`}
          />
          {valid && derivedName && !name && (
            <span className="pointer-events-none absolute right-3 top-1/2 max-w-[100px] -translate-y-1/2 truncate rounded-md bg-surface-2 px-2 py-1 text-[11px] text-muted">
              {derivedName}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!valid || blocked || saving}
          className="shrink-0 rounded-xl bg-brand px-6 py-3.5 font-display text-sm font-bold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
        >
          {saving ? "Logging…" : "Log connect"}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-xs text-muted transition-colors hover:text-text"
        >
          {showDetails ? "Hide details" : "Add name, note or tags"}
        </button>
        {error && <span className="text-xs text-rose">{error}</span>}
      </div>

      {duplicate && (
        <div
          id="duplicate-warning"
          role="alert"
          className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-rose/30 bg-rose-soft/40 px-3.5 py-2.5 text-xs"
        >
          <span className="text-rose">
            Already logged - {duplicate.name || "this profile"},{" "}
            {relativeDay(duplicate.sent_on)?.toLowerCase() ??
              formatShort(duplicate.sent_on)}
            . Update that one instead of logging it twice.
          </span>
          <a
            href={duplicate.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded-md bg-ink/50 px-2 py-1 text-muted transition-colors hover:text-text"
          >
            Open profile
          </a>
        </div>
      )}

      {showDetails && (
        <div className="mt-3 grid gap-2.5 border-t border-line-soft pt-3.5 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={derivedName || "Name"}
            className="rounded-lg border border-line-soft bg-ink px-3 py-2.5 text-sm placeholder:text-muted/60 focus:border-brand focus:outline-none"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            className="rounded-lg border border-line-soft bg-ink px-3 py-2.5 text-sm placeholder:text-muted/60 focus:border-brand focus:outline-none"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags, comma separated"
            className="rounded-lg border border-line-soft bg-ink px-3 py-2.5 font-mono text-xs placeholder:font-sans placeholder:text-sm placeholder:text-muted/60 focus:border-brand focus:outline-none"
          />
        </div>
      )}
    </form>
  );
}
