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
  CATEGORIES,
  CATEGORY_GROUPS,
  cellKey,
  citySlug,
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
  const { cities, sweeps, businesses, loading } = useBiz();
  const [selected, setSelected] = useState<{ category: string; city: string } | null>(
    null
  );

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === selected?.category),
    [selected]
  );
  const city = useMemo(
    () => cities.find((c) => c.id === selected?.city),
    [cities, selected]
  );

  const totalCells = CATEGORIES.length * cities.length;
  const sweptCells = useMemo(
    () =>
      CATEGORIES.reduce(
        (n, cat) => n + cities.filter((c) => sweeps.has(cellKey(cat.id, c.id))).length,
        0
      ),
    [cities, sweeps]
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
      />

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
  const { cities, allCities, addCity, setCityActive } = useBiz();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [dial, setDial] = useState("");
  const retired = allCities.filter((c) => !c.active);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await addCity({
      id: citySlug(trimmed),
      name: trimmed,
      region: region.trim(),
      dial: dial.replace(/\D/g, ""),
      sort: cities.length + 1,
      active: true,
    });
    setName("");
    setRegion("");
    setDial("");
    setAdding(false);
  }

  const miniField =
    "rounded-full border border-line-soft bg-well px-3 py-1.5 text-[11px] focus:border-brand-edge focus:outline-none";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {cities.map((c) => (
        <span
          key={c.id}
          className="group inline-flex items-center gap-1.5 rounded-full bg-surface py-1.5 pr-1.5 pl-3.5 text-[11px] font-semibold shadow-raised"
        >
          {c.name}
          {c.region && <span className="font-normal text-muted/60">{c.region}</span>}
          <button
            type="button"
            onClick={() => setCityActive(c.id, false)}
            aria-label={`Retire ${c.name}`}
            title="Retire this city - its businesses stay"
            className="rounded-full px-1.5 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose focus-visible:opacity-100"
          >
            ×
          </button>
        </span>
      ))}

      {retired.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setCityActive(c.id, true)}
          className="rounded-full border border-dashed border-line px-3 py-1.5 text-[11px] font-semibold text-muted/60 transition-colors hover:text-text"
        >
          {c.name} ↩
        </button>
      ))}

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

function Grid({
  cities,
  selected,
  onSelect,
}: {
  cities: City[];
  selected: { category: string; city: string } | null;
  onSelect: (cell: { category: string; city: string }) => void;
}) {
  const { sweeps, countIn } = useBiz();

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
          {CATEGORY_GROUPS.map((group) => (
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
  const rows = CATEGORIES.filter((c) => c.group === group);
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
            className="sticky left-0 z-10 max-w-[9.5rem] truncate bg-surface py-1 pr-3 text-left text-[13px] font-medium"
          >
            {category.label}
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
