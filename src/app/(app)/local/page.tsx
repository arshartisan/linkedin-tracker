"use client";

import { useMemo, useState } from "react";
import { CheckIcon, PlusIcon } from "lucide-react";
import { useBiz } from "@/components/BizProvider";
import { AddBusiness } from "@/components/AddBusiness";
import { BizRow } from "@/components/BizRow";
import {
  Card,
  EmptyState,
  Page,
  PageHeader,
  SectionHeading,
  Well,
} from "@/components/ui/layout";
import { formatShort, relativeDay } from "@/lib/date";
import { USER_LABEL } from "@/lib/types";
import {
  cellKey,
  queriesFor,
  searchLinks,
  type Category,
  type City,
} from "@/lib/biz";

/**
 * The sweep grid: every category down the side, every city across the top, one
 * cell per search you have to run.
 *
 * The whole section starts here, and the grid is the point of it. "Find local
 * businesses" is an infinite task with no natural edge, so it gets a finite
 * shape - sixteen trades × however many cities - and the job becomes filling in
 * cells rather than searching until you get bored.
 */
export default function LocalPage() {
  const { cities, categories, sweeps, businesses, loading } = useBiz();
  const [selected, setSelected] = useState<{ category: string; city: string } | null>(
    null
  );
  const [logging, setLogging] = useState(false);

  const category = useMemo(
    () => categories.find((c) => c.id === selected?.category),
    [categories, selected]
  );
  const city = useMemo(
    () => cities.find((c) => c.id === selected?.city),
    [cities, selected]
  );

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

      <Card className="p-3 sm:p-4">
        <Grid
          cities={cities}
          selected={selected}
          onSelect={(next) =>
            setSelected((prev) =>
              prev && prev.category === next.category && prev.city === next.city
                ? null
                : next
            )
          }
        />
      </Card>

      <RetiredCategories />

      {category && city && (
        <CellPanel
          key={cellKey(category.id, city.id)}
          category={category}
          city={city}
          onClose={() => setSelected(null)}
        />
      )}

      {!category && cities.length > 0 && (
        <p className="mt-5 text-sm text-muted">
          Pick a cell to open its searches.
          {businesses.length === 0 && (
            <span className="text-muted/60">
              {" "}
              Top-left is as good a place to start as any.
            </span>
          )}
        </p>
      )}
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

function Grid({
  cities,
  selected,
  onSelect,
}: {
  cities: City[];
  selected: { category: string; city: string } | null;
  onSelect: (cell: { category: string; city: string }) => void;
}) {
  const { sweeps, countIn, categoryGroups } = useBiz();

  if (cities.length === 0) {
    return (
      <EmptyState title="No cities." className="border-0">
        Add one above and the grid builds itself.
      </EmptyState>
    );
  }

  return (
    /*
      Sixteen rows by however many cities does not fold onto a phone, so the
      table scrolls sideways with the category column pinned - which is the one
      you need to keep reading the row you're on.
    */
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface pb-2 text-left" />
            {cities.map((c) => (
              <th key={c.id} scope="col" className="label pb-2 text-center text-[10px]">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categoryGroups.map((group) => (
            <GroupRows
              key={group}
              group={group}
              cities={cities}
              selected={selected}
              onSelect={onSelect}
              sweeps={sweeps}
              countIn={countIn}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({
  group,
  cities,
  selected,
  onSelect,
  sweeps,
  countIn,
}: {
  group: string;
  cities: City[];
  selected: { category: string; city: string } | null;
  onSelect: (cell: { category: string; city: string }) => void;
  sweeps: ReturnType<typeof useBiz>["sweeps"];
  countIn: ReturnType<typeof useBiz>["countIn"];
}) {
  const { categories, businesses, setCategoryActive, removeCategory } = useBiz();
  const rows = categories.filter((c) => c.group === group);

  // Same rule as the city chips: a type with nothing logged against it can go,
  // one with businesses only retires.
  async function drop(category: Category) {
    const used = businesses.some((b) => b.category === category.id);
    if (used || !category.custom) await setCategoryActive(category.id, false);
    else await removeCategory(category.id);
  }

  if (rows.length === 0) return null;

  return (
    <>
      <tr>
        <th
          colSpan={cities.length + 1}
          scope="colgroup"
          className="label sticky left-0 bg-surface pt-4 pb-1.5 text-left text-[10px] text-muted/50"
        >
          {group}
        </th>
      </tr>
      {rows.map((category) => (
        <tr key={category.id} className="group">
          <th
            scope="row"
            className="sticky left-0 z-10 max-w-[9.5rem] bg-surface py-1 pr-3 text-left text-[13px] font-medium"
          >
            <span className="flex items-center gap-1">
              <span className="min-w-0 truncate">{category.label}</span>
              <button
                type="button"
                onClick={() => drop(category)}
                aria-label={`Remove ${category.label} from the grid`}
                title="Take this type off the grid"
                className="shrink-0 rounded-full px-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose focus-visible:opacity-100"
              >
                ×
              </button>
            </span>
          </th>
          {cities.map((city) => {
            const swept = sweeps.get(cellKey(category.id, city.id));
            const count = countIn(category.id, city.id);
            const active =
              selected?.category === category.id && selected?.city === city.id;
            return (
              <td key={city.id} className="p-0.5">
                <button
                  type="button"
                  onClick={() => onSelect({ category: category.id, city: city.id })}
                  aria-pressed={active}
                  title={
                    swept
                      ? `Swept ${formatShort(swept.swept_on)} by ${USER_LABEL[swept.owner]} · ${count} logged`
                      : `${count} logged`
                  }
                  /*
                    Three states, and they have to be distinguishable at a
                    glance across a whole grid: untouched is an empty well,
                    logged-but-unswept carries its count in lime, and swept goes
                    quiet with a tick - done work should stop asking for
                    attention.
                  */
                  className={`tabular flex h-9 w-full items-center justify-center rounded-control border text-xs font-bold transition-all ${
                    active
                      ? "border-brand-edge bg-brand-soft text-brand"
                      : swept
                        ? "border-transparent bg-well text-muted/60 hover:text-muted"
                        : count > 0
                          ? "border-brand-edge/40 bg-surface-2 text-brand shadow-raised"
                          : "border-transparent bg-well/60 text-muted/30 hover:bg-well hover:text-muted"
                  }`}
                >
                  {swept && count === 0 ? (
                    <CheckIcon className="size-3.5" aria-hidden />
                  ) : (
                    <span className="flex items-center gap-1">
                      {count > 0 ? count : "·"}
                      {swept && <CheckIcon className="size-3 opacity-60" aria-hidden />}
                    </span>
                  )}
                </button>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/** One cell, opened up: the searches to run, the form to log them, what's in it. */
function CellPanel({
  category,
  city,
  onClose,
}: {
  category: Category;
  city: City;
  onClose: () => void;
}) {
  const { businesses, sweeps, markSwept, clearSweep } = useBiz();
  const inCell = businesses.filter(
    (b) => b.category === category.id && b.city === city.id
  );
  const swept = sweeps.get(cellKey(category.id, city.id));

  return (
    <Card className="fade-in mt-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold">
          {category.label}{" "}
          <span className="text-xs font-semibold text-muted">in {city.name}</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-muted transition-colors hover:text-text"
        >
          Close
        </button>
      </div>

      {/*
        Three engines per phrasing, because they surface different businesses:
        Maps has the ones with a pin, Google the ones with a site and no pin,
        and Facebook the ones with neither - which in Doha and Lusail is most
        of the small operators worth pitching.
      */}
      <div className="mt-3.5 flex flex-col gap-1.5">
        {queriesFor(category, city).map((query) => {
          const links = searchLinks(query);
          return (
            <Well
              key={query}
              className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3.5 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">
                {query}
              </span>
              {(
                [
                  ["Maps", links.maps],
                  ["Google", links.google],
                  ["Facebook", links.facebook],
                ] as const
              ).map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted transition-colors hover:text-brand"
                >
                  {label}
                </a>
              ))}
            </Well>
          );
        })}
      </div>

      <div className="mt-3.5">
        <AddBusiness category={category} city={city} />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-line-soft pt-3.5">
        {swept ? (
          <>
            <span className="text-[11px] text-muted">
              Swept{" "}
              {relativeDay(swept.swept_on)?.toLowerCase() ?? formatShort(swept.swept_on)}{" "}
              by {USER_LABEL[swept.owner]}
            </span>
            <button
              type="button"
              onClick={() => clearSweep(category.id, city.id)}
              className="text-[11px] font-semibold text-muted transition-colors hover:text-text"
            >
              Sweep it again
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => markSwept(category.id, city.id, inCell.length)}
            className="rounded-full bg-surface-2 px-4 py-2 text-[11px] font-bold text-muted transition-colors hover:text-brand"
          >
            Mark this search swept
          </button>
        )}
      </div>

      {inCell.length > 0 && (
        <div className="mt-3.5">
          <SectionHeading count={inCell.length}>Logged here</SectionHeading>
          <ul className="flex flex-col gap-2">
            {inCell.map((business, i) => (
              <BizRow key={business.id} business={business} index={i} showAction={false} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
