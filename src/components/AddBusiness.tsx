"use client";

import { useMemo, useRef, useState } from "react";
import { useBiz } from "./BizProvider";
import { BIZ_DUPLICATE_MESSAGE } from "@/lib/biz-store";
import { parseTags } from "@/lib/linkedin";
import { formatShort, relativeDay } from "@/lib/date";
import { USER_LABEL } from "@/lib/types";
import { toE164, type Category, type City } from "@/lib/biz";

const FIELD =
  "rounded-lg border border-line-soft bg-ink px-3 py-2.5 text-sm placeholder:text-muted/60 focus:border-brand focus:outline-none";

/**
 * The logging half of a sweep. You have the search results open in another tab;
 * this is where each one lands.
 *
 * Name is the only required field on purpose. A business with nothing but a
 * name is still a lead - it just starts in the research lane instead of the
 * messaging one - and making the form demand a website would mean skipping
 * exactly the small operators worth pitching.
 */
export function AddBusiness({
  category,
  city,
  onAdded,
}: {
  category: Category;
  city: City;
  onAdded?: () => void;
}) {
  const { add, findDuplicate } = useBiz();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [more, setMore] = useState(false);
  const [maps, setMaps] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  const duplicate = useMemo(
    () => (name.trim() || website.trim() ? findDuplicate(website, name, city.id) : null),
    [name, website, city.id, findDuplicate]
  );
  const blocked = Boolean(duplicate);
  // The database said no after the form said yes: a teammate logged this one
  // between the two checks.
  const raced = error === BIZ_DUPLICATE_MESSAGE;

  function reset() {
    setName("");
    setWebsite("");
    setFacebook("");
    setWhatsapp("");
    setMaps("");
    setNote("");
    setTags("");
    nameRef.current?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("A name, at least.");
      return;
    }
    if (blocked) {
      setError(BIZ_DUPLICATE_MESSAGE);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await add({
        name,
        category: category.id,
        city: city.id,
        website,
        facebook,
        // Normalised against the city's dialling code, so a number copied off a
        // Qatari page as "05512 3456" is stored as +9745512 3456's E.164 form.
        whatsapp: whatsapp.trim() ? toE164(whatsapp, city.dial) ?? "" : "",
        maps_url: maps,
        note,
        tags: parseTags(tags),
      });
      setAdded((n) => n + 1);
      reset();
      onAdded?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-surface p-3.5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="Business name"
          aria-label="Business name"
          aria-invalid={blocked || raced || undefined}
          autoComplete="off"
          className={`min-w-0 flex-1 ${FIELD} ${
            blocked || raced ? "border-rose focus:border-rose" : ""
          }`}
        />
        <button
          type="submit"
          disabled={!name.trim() || blocked || saving}
          className="shrink-0 rounded-lg bg-brand px-5 py-2.5 font-display text-sm font-bold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
        >
          {saving ? "Logging…" : "Log"}
        </button>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            setError(null);
          }}
          placeholder="Website"
          className={`${FIELD} py-2 text-xs`}
        />
        <input
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
          placeholder="Facebook page"
          className={`${FIELD} py-2 text-xs`}
        />
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder={city.dial ? `WhatsApp (+${city.dial})` : "WhatsApp"}
          inputMode="tel"
          className={`${FIELD} py-2 font-mono text-xs placeholder:font-sans`}
        />
      </div>

      {more && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <input value={maps} onChange={(e) => setMaps(e.target.value)} placeholder="Maps link" className={`${FIELD} py-2 text-xs`} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className={`${FIELD} py-2 text-xs`} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated" className={`${FIELD} py-2 font-mono text-xs placeholder:font-sans`} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="text-xs text-muted transition-colors hover:text-text"
        >
          {more ? "Fewer fields" : "Maps, note, tags"}
        </button>
        {added > 0 && !error && !duplicate && (
          <span className="tabular font-mono text-[10px] uppercase tracking-wide text-brand-dim">
            {added} logged here
          </span>
        )}
        {error && !raced && <span className="text-xs text-rose">{error}</span>}
      </div>

      {duplicate ? (
        <p role="alert" className="mt-2 rounded-lg border border-rose/30 bg-rose-soft/40 px-3 py-2 text-xs text-rose">
          {USER_LABEL[duplicate.owner]} already logged{" "}
          {duplicate.name || "this business"}
          {duplicate.found_on
            ? `, ${relativeDay(duplicate.found_on)?.toLowerCase() ?? formatShort(duplicate.found_on)}`
            : ""}
          . It&apos;s already in the pipeline.
        </p>
      ) : (
        raced && (
          <p role="alert" className="mt-2 rounded-lg border border-rose/30 bg-rose-soft/40 px-3 py-2 text-xs text-rose">
            {BIZ_DUPLICATE_MESSAGE} Reload to see who has it.
          </p>
        )
      )}
    </form>
  );
}
