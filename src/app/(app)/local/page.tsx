"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useBiz } from "@/components/BizProvider";
import { AddBusiness } from "@/components/AddBusiness";
import { Card, Page, PageHeader, SectionHeading, Well } from "@/components/ui/layout";
import { cellKey, type City } from "@/lib/biz";

/**
 * The head of the local section: how much has been logged, the cities it is
 * being logged against, and the form to log one.
 */
export default function LocalPage() {
  const { cities, categories, sweeps, businesses, loading } = useBiz();
  const [logging, setLogging] = useState(false);

  const totalCells = categories.length * cities.length;
  const sweptCells = useMemo(
    () =>
      categories.reduce(
        (n, cat) => n + cities.filter((c) => sweeps.has(cellKey(cat.id, c.id))).length,
        0
      ),
    [categories, cities, sweeps]
  );

  if (loading) {
    return (
      <Page>
        <p className="text-sm text-muted">Loading…</p>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Prospect"
        lead="One cell per search. Run it, log what it turns up, tick it off."
        actions={
          <button
            type="button"
            onClick={() => setLogging((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2 text-xs font-bold text-muted transition-colors hover:text-brand"
          >
            <PlusIcon className="size-3.5" aria-hidden />
            {logging ? "Close" : "Log a business"}
          </button>
        }
      />

      {/*
        The same form the cells carry, with its type and city unpinned. A
        business you walked past, or one a friend mentioned, does not belong to
        a search you were running - and hunting for its cell first was the tax
        this removes.
      */}
      {logging && (
        <Card className="fade-in mb-4 p-4 sm:p-5">
          <SectionHeading hint="Pick the type and city, or add ones that aren't there yet.">
            Log a business
          </SectionHeading>
          <AddBusiness />
        </Card>
      )}

      <Card className="mb-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="tabular flex items-baseline gap-2.5">
            <span className="font-display text-[56px] leading-none font-extrabold text-brand sm:text-[68px]">
              {businesses.length}
            </span>
            <span className="text-sm text-muted">businesses logged</span>
          </div>

          <Well className="min-w-[180px] px-4 py-3">
            <div className="tabular font-display text-xl leading-none font-extrabold">
              {sweptCells}
              <span className="text-sm font-semibold text-muted"> / {totalCells}</span>
            </div>
            <div className="mt-1 text-[11px] text-muted">searches swept</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink">
              <div
                className="h-full rounded-full bg-brand/70 transition-all duration-500"
                style={{
                  width: `${totalCells === 0 ? 0 : (sweptCells / totalCells) * 100}%`,
                }}
              />
            </div>
          </Well>
        </div>
      </Card>

      <CityBar />

      <RetiredCategories />
    </Page>
  );
}

/**
 * The cities the grid is built from, plus the way to add one. Kept as a plain
 * chip row rather than a settings screen: the list changes about once a month,
 * and burying it a click away would make the grid look like a fixed fact.
 */
function CityBar() {
  const { cities, allCities, businesses, addCity, setCityActive, removeCity } = useBiz();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [dial, setDial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const retired = allCities.filter((c) => !c.active);

  // What is logged against each city, which is what decides whether its × is a
  // retire or a delete: a city with businesses cannot go away without leaving
  // them pointing at an id that resolves to nothing.
  const logged = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of businesses) counts.set(b.city, (counts.get(b.city) ?? 0) + 1);
    return counts;
  }, [businesses]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await addCity({ name, region, dial });
      setName("");
      setRegion("");
      setDial("");
      setAdding(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function drop(city: City) {
    setError(null);
    try {
      // Nothing logged against it, so nothing to orphan - it goes for good.
      // Otherwise it retires, and the chip moves to the dashed row below.
      if ((logged.get(city.id) ?? 0) === 0) await removeCity(city.id);
      else await setCityActive(city.id, false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const miniField =
    "rounded-full border border-line-soft bg-well px-3 py-1.5 text-[11px] focus:border-brand-edge focus:outline-none";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {cities.map((c) => {
        const count = logged.get(c.id) ?? 0;
        return (
          <span
            key={c.id}
            className="group inline-flex items-center gap-1.5 rounded-full bg-surface py-1.5 pr-1.5 pl-3.5 text-[11px] font-semibold shadow-raised"
          >
            {c.name}
            {c.region && <span className="font-normal text-muted/60">{c.region}</span>}
            <button
              type="button"
              onClick={() => drop(c)}
              aria-label={count > 0 ? `Retire ${c.name}` : `Delete ${c.name}`}
              title={
                count > 0
                  ? `Retire ${c.name} - its ${count} logged ${count === 1 ? "business stays" : "businesses stay"}`
                  : `Delete ${c.name} - nothing is logged against it`
              }
              className="rounded-full px-1.5 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose focus-visible:opacity-100"
            >
              ×
            </button>
          </span>
        );
      })}

      {retired.map((c) => (
        <span
          key={c.id}
          className="group inline-flex items-center rounded-full border border-dashed border-line py-1.5 pr-1.5 pl-3 text-[11px] font-semibold text-muted/60"
        >
          <button
            type="button"
            onClick={() => setCityActive(c.id, true)}
            title={`Bring ${c.name} back into the grid`}
            className="transition-colors hover:text-text"
          >
            {c.name} ↩
          </button>
          {(logged.get(c.id) ?? 0) === 0 && (
            <button
              type="button"
              onClick={() => removeCity(c.id)}
              aria-label={`Delete ${c.name}`}
              title="Delete for good"
              className="rounded-full px-1.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose focus-visible:opacity-100"
            >
              ×
            </button>
          )}
        </span>
      ))}

      {error && <span className="text-[11px] text-rose">{error}</span>}

      {adding ? (
        <form onSubmit={submit} className="flex flex-wrap items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="City"
            className={`${miniField} w-28`}
          />
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Region / country"
            className={`${miniField} w-36`}
          />
          <input
            value={dial}
            onChange={(e) => setDial(e.target.value)}
            placeholder="Dial (974)"
            inputMode="numeric"
            title="Country calling code - what turns a local number into one WhatsApp accepts"
            className={`${miniField} w-24 font-mono`}
          />
          <button
            type="submit"
            className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold text-ink"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="px-1.5 text-[11px] font-semibold text-muted hover:text-text"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:border-brand-edge hover:text-brand"
        >
          <PlusIcon className="size-3" aria-hidden />
          City
        </button>
      )}
    </div>
  );
}

/**
 * The types taken off the grid, and the way back. Under the grid rather than
 * above it: this is the undo for a row you removed, not a list anyone needs to
 * read on the way in.
 */
function RetiredCategories() {
  const { allCategories, businesses, setCategoryActive, removeCategory } = useBiz();
  const retired = allCategories.filter((c) => !c.active);
  if (retired.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="label mr-1 text-[10px] text-muted/45">Off the grid</span>
      {retired.map((c) => (
        <span
          key={c.id}
          className="group inline-flex items-center rounded-full border border-dashed border-line py-1 pr-1 pl-2.5 text-[11px] font-semibold text-muted/60"
        >
          <button
            type="button"
            onClick={() => setCategoryActive(c.id, true)}
            title={`Put ${c.label} back on the grid`}
            className="transition-colors hover:text-text"
          >
            {c.label} ↩
          </button>
          {c.custom && !businesses.some((b) => b.category === c.id) && (
            <button
              type="button"
              onClick={() => removeCategory(c.id)}
              aria-label={`Delete ${c.label}`}
              title="Delete for good"
              className="rounded-full px-1.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose focus-visible:opacity-100"
            >
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
