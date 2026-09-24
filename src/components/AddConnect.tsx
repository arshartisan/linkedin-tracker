"use client";

import { useMemo, useRef, useState } from "react";
import { useData } from "./DataProvider";
import { Card, FIELD, PrimaryButton } from "@/components/ui/layout";
import { isLinkedInUrl, nameFromUrl, parseTags } from "@/lib/linkedin";
import { formatShort, relativeDay } from "@/lib/date";
import { DUPLICATE_MESSAGE } from "@/lib/store";
import { USER_LABEL } from "@/lib/types";

export function AddConnect() {
  const { me, add, findDuplicate } = useData();
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
  // One profile, one row - across the whole team. Two of us approaching the
  // same person is the thing this tracker exists to prevent, and a second row
  // also inflates the tally and breaks the funnel rates. Hard stop either way.
  const blocked = Boolean(duplicate);
  // The database said no after the form said yes: a teammate logged this person
  // between the two. Same panel, since it's the same situation.
  const raced = error === DUPLICATE_MESSAGE;

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
      setError(DUPLICATE_MESSAGE);
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
    <Card as="div" className="p-4 sm:p-5">
      <form onSubmit={submit}>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <input
              ref={urlRef}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="Paste the LinkedIn profile link"
              aria-label="LinkedIn profile link"
              aria-invalid={blocked || raced || undefined}
              aria-describedby={duplicate || raced ? "duplicate-warning" : undefined}
              autoComplete="off"
              spellCheck={false}
              className={`${FIELD} py-3.5 pr-28 font-mono text-[13px] placeholder:font-sans placeholder:text-sm ${
                blocked || raced ? "border-rose/60 focus:border-rose" : ""
              }`}
            />
            {valid && derivedName && !name && (
              <span className="pointer-events-none absolute top-1/2 right-3 max-w-[110px] -translate-y-1/2 truncate rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                {derivedName}
              </span>
            )}
          </div>

          <PrimaryButton
            type="submit"
            disabled={!valid || blocked || raced || saving}
            className="shrink-0 sm:self-center"
          >
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 2.5v7M2.5 6h7" />
            </svg>
            {saving ? "Logging…" : "Log connect"}
          </PrimaryButton>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs font-semibold text-muted transition-colors hover:text-text"
          >
            {showDetails ? "Hide details" : "Add name, note or tags"}
          </button>
          {error && !raced && <span className="text-xs text-rose">{error}</span>}
        </div>

        {duplicate ? (
          <div
            id="duplicate-warning"
            role="alert"
            className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-well border border-rose/25 bg-rose-soft/35 px-3.5 py-2.5 text-xs"
          >
            <span className="text-rose">
              {duplicate.owner === me.id ? (
                <>
                  You already connected with {duplicate.name || "this profile"},{" "}
                  {relativeDay(duplicate.sent_on)?.toLowerCase() ??
                    formatShort(duplicate.sent_on)}
                  . Update that one instead of logging it twice.
                </>
              ) : (
                <>
                  {USER_LABEL[duplicate.owner]} already connected with{" "}
                  {duplicate.name || "this profile"},{" "}
                  {relativeDay(duplicate.sent_on)?.toLowerCase() ??
                    formatShort(duplicate.sent_on)}
                  . Leave this one to {USER_LABEL[duplicate.owner]}.
                </>
              )}
            </span>
            <a
              href={duplicate.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto rounded-full bg-ink/50 px-2.5 py-1 font-medium text-muted transition-colors hover:text-text"
            >
              Open profile
            </a>
          </div>
        ) : (
          raced && (
            <div
              id="duplicate-warning"
              role="alert"
              className="mt-3 rounded-well border border-rose/25 bg-rose-soft/35 px-3.5 py-2.5 text-xs text-rose"
            >
              {DUPLICATE_MESSAGE} Reload to see who has them.
            </div>
          )
        )}

        {showDetails && (
          <div className="mt-3 grid gap-2.5 border-t border-line-soft pt-3.5 sm:grid-cols-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={derivedName || "Name"}
              className={FIELD}
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note"
              className={FIELD}
            />
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags, comma separated"
              className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`}
            />
          </div>
        )}
      </form>
    </Card>
  );
}
