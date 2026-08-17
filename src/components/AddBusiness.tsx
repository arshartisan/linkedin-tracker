"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useBiz } from "./BizProvider";
import { BIZ_DUPLICATE_MESSAGE } from "@/lib/biz-store";
import { parseTags } from "@/lib/linkedin";
import { formatShort, relativeDay } from "@/lib/date";
import { USER_LABEL } from "@/lib/types";
import { toE164, type Category, type City } from "@/lib/biz";
import { FIELD, PrimaryButton } from "@/components/ui/layout";
import { Picker, PickerField, type PickerCreate } from "@/components/ui/picker";

/**
 * The logging half of a sweep. You have the search results open in another tab;
 * this is where each one lands.
 *
 * Name is the only required field on purpose. A business with nothing but a
 * name is still a lead - it just starts in the research lane instead of the
 * messaging one - and making the form demand a website would mean skipping
 * exactly the small operators worth pitching.
 *
 * `category` and `city` are optional. Opened from a cell of the grid they are
 * fixed and the form doesn't ask; opened on its own it grows two pickers, so a
 * business you happened across can be logged without hunting for its cell -
 * and a type or city that doesn't exist yet can be made from inside them.
 */
export function AddBusiness({
  category: fixedCategory,
  city: fixedCity,
  onAdded,
}: {
  category?: Category;
  city?: City;
  onAdded?: () => void;
}) {
  const { add, findDuplicate, categories, cities, categoryById } = useBiz();

  const [categoryId, setCategoryId] = useState(fixedCategory?.id ?? "");
  const [cityId, setCityId] = useState(fixedCity?.id ?? cities[0]?.id ?? "");
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

  const category = fixedCategory ?? categoryById(categoryId);
  // Resolved rather than stored: cities arrive a tick after the first render,
  // and the chosen one can be retired from the chip row above while this form
  // is open. Falling through to the first city keeps the picker on something
  // real either way, without a state write chasing the list.
  const city = fixedCity ?? cities.find((c) => c.id === cityId) ?? cities[0];

  const duplicate = useMemo(
    () =>
      city && (name.trim() || website.trim())
        ? findDuplicate(website, name, city.id)
        : null,
    [name, website, city, findDuplicate]
  );
  const blocked = Boolean(duplicate);
  // The database said no after the form said yes: a teammate logged this one
  // between the two checks.
  const raced = error === BIZ_DUPLICATE_MESSAGE;

  const ready = Boolean(name.trim() && category && city);

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
    if (!category || !city) {
      setError("Pick a type and a city.");
      return;
    }
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

  const picking = !fixedCategory || !fixedCity;

  return (
    <form onSubmit={submit} className="well p-3.5">
      {picking && (
        <div className="mb-2.5 grid gap-2 sm:grid-cols-2">
          {!fixedCategory && (
            <PickerField label="Business type">
              <Picker
                label="Business type"
                placeholder="Choose a type…"
                searchPlaceholder="Cleaning, garage, salon…"
                createLabel="Add"
                value={categoryId}
                onChange={(next) => {
                  setCategoryId(next);
                  setError(null);
                }}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.label,
                  group: c.group,
                }))}
                renderCreate={(create) => <CreateCategory {...create} />}
              />
            </PickerField>
          )}
          {!fixedCity && (
            <PickerField label="City">
              <Picker
                label="City"
                placeholder="Choose a city…"
                searchPlaceholder="Doha, Newport…"
                createLabel="Add"
                value={city?.id ?? ""}
                onChange={(next) => {
                  setCityId(next);
                  setError(null);
                }}
                options={cities.map((c) => ({
                  value: c.id,
                  label: c.name,
                  hint: c.region,
                }))}
                renderCreate={(create) => <CreateCity {...create} />}
              />
            </PickerField>
          )}
        </div>
      )}

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
          className={`min-w-0 flex-1 ${FIELD} bg-ink ${
            blocked || raced ? "border-rose/60 focus:border-rose" : ""
          }`}
        />
        <PrimaryButton type="submit" disabled={!ready || blocked || saving} className="shrink-0">
          {saving ? "Logging…" : "Log"}
        </PrimaryButton>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            setError(null);
          }}
          placeholder="Website"
          className={`${FIELD} bg-ink py-2 text-xs`}
        />
        <input
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
          placeholder="Facebook page"
          className={`${FIELD} bg-ink py-2 text-xs`}
        />
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder={city?.dial ? `WhatsApp (+${city.dial})` : "WhatsApp"}
          inputMode="tel"
          className={`${FIELD} bg-ink py-2 font-mono text-xs placeholder:font-sans`}
        />
      </div>

      {more && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <input value={maps} onChange={(e) => setMaps(e.target.value)} placeholder="Maps link" className={`${FIELD} bg-ink py-2 text-xs`} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className={`${FIELD} bg-ink py-2 text-xs`} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated" className={`${FIELD} bg-ink py-2 font-mono text-xs placeholder:font-sans`} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="text-xs font-semibold text-muted transition-colors hover:text-text"
        >
          {more ? "Fewer fields" : "Maps, note, tags"}
        </button>
        {added > 0 && !error && !duplicate && (
          <span className="label tabular text-[10px] text-brand-dim">
            {added} logged{picking ? "" : " here"}
          </span>
        )}
        {error && !raced && <span className="text-xs text-rose">{error}</span>}
      </div>

      {duplicate ? (
        <p role="alert" className="mt-2 rounded-well border border-rose/25 bg-rose-soft/35 px-3.5 py-2.5 text-xs text-rose">
          {USER_LABEL[duplicate.owner]} already logged{" "}
          {duplicate.name || "this business"}
          {duplicate.found_on
            ? `, ${relativeDay(duplicate.found_on)?.toLowerCase() ?? formatShort(duplicate.found_on)}`
            : ""}
          . It&apos;s already in the pipeline.
        </p>
      ) : (
        raced && (
          <p role="alert" className="mt-2 rounded-well border border-rose/25 bg-rose-soft/35 px-3.5 py-2.5 text-xs text-rose">
            {BIZ_DUPLICATE_MESSAGE} Reload to see who has it.
          </p>
        )
      )}
    </form>
  );
}

const MINI =
  "w-full rounded-control border border-line-soft bg-well px-3 py-2 text-xs text-text placeholder:text-muted/60 focus:border-brand-edge focus:outline-none";

/**
 * Adding a business type from inside the picker. The label is the search term -
 * "tyre shops" becomes "tyre shops in {city}" - so it is phrased as the thing
 * you would type into Maps, not as a heading.
 */
function CreateCategory({ query, done, cancel }: PickerCreate) {
  const { addCategory, categoryGroups } = useBiz();
  const [label, setLabel] = useState(query.trim());
  const [group, setGroup] = useState(categoryGroups[0] ?? "Home");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();

  async function save() {
    if (!label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await addCategory({ label, group });
      done(created.id);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          void save();
        }}
        placeholder="Type, as you'd search it"
        aria-label="Business type"
        className={MINI}
      />
      <input
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          void save();
        }}
        list={listId}
        placeholder="Group"
        aria-label="Group"
        title="Which block of the grid it sits in"
        className={MINI}
      />
      <datalist id={listId}>
        {categoryGroups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      {error && <p className="text-[11px] text-rose">{error}</p>}
      <CreateActions saving={saving} disabled={!label.trim()} onSave={save} onCancel={cancel} />
    </div>
  );
}

/**
 * Adding a city from inside the picker. `dial` is asked for here rather than
 * later because it is what turns a local number into one WhatsApp accepts -
 * a city without it means every number logged against it has to be fixed by
 * hand.
 */
function CreateCity({ query, done, cancel }: PickerCreate) {
  const { addCity } = useBiz();
  const [name, setName] = useState(query.trim());
  const [region, setRegion] = useState("");
  const [dial, setDial] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await addCity({ name, region, dial });
      done(created.id);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          void save();
        }}
        placeholder="City"
        aria-label="City"
        className={MINI}
      />
      <input
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          void save();
        }}
        placeholder="Region / country"
        aria-label="Region or country"
        title="Disambiguates the search - Newport alone finds the wrong one"
        className={MINI}
      />
      <input
        value={dial}
        onChange={(e) => setDial(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          void save();
        }}
        placeholder="Dial code (974)"
        aria-label="Dial code"
        inputMode="numeric"
        title="Country calling code - what turns a local number into one WhatsApp accepts"
        className={`${MINI} font-mono placeholder:font-sans`}
      />
      {error && <p className="text-[11px] text-rose">{error}</p>}
      <CreateActions saving={saving} disabled={!name.trim()} onSave={save} onCancel={cancel} />
    </div>
  );
}

function CreateActions({
  saving,
  disabled,
  onSave,
  onCancel,
}: {
  saving: boolean;
  disabled: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={disabled || saving}
        className="rounded-full bg-brand px-3.5 py-1.5 text-[11px] font-bold text-ink transition-opacity hover:opacity-90 disabled:bg-surface-2 disabled:text-muted"
      >
        {saving ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-text"
      >
        Back
      </button>
    </div>
  );
}
