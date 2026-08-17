"use client";

import { useMemo, useState } from "react";
import { useBiz } from "@/components/BizProvider";
import { BizRow } from "@/components/BizRow";
import { USER_LABEL, type UserId } from "@/lib/types";
import {
  BIZ_STAGES,
  BIZ_STAGE_LABEL,
  CATEGORIES,
  categoryLabel,
  type BizStage,
  type Business,
} from "@/lib/biz";

type Owner = UserId | "all";

/**
 * Everything logged, filterable. The grid answers "what have we covered"; this
 * answers "where is everything", which is a different question and the one you
 * ask when a stage chip needs correcting or a note needs adding.
 */
export default function LocalPipelinePage() {
  const { businesses, cities, loading } = useBiz();
  const [stage, setStage] = useState<BizStage | "all">("all");
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [owner, setOwner] = useState<Owner>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return businesses.filter((b) => {
      if (stage !== "all" && b.stage !== stage) return false;
      if (city !== "all" && b.city !== city) return false;
      if (category !== "all" && b.category !== category) return false;
      if (owner !== "all" && b.owner !== owner) return false;
      if (!needle) return true;
      return (
        b.name.toLowerCase().includes(needle) ||
        b.website.toLowerCase().includes(needle) ||
        b.note.toLowerCase().includes(needle) ||
        b.tags.some((t) => t.includes(needle))
      );
    });
  }, [businesses, stage, city, category, owner, query]);

  // Counts come off the *unfiltered* list on purpose: a stage tab that reads
  // zero because of a city filter looks like a stage with nothing in it.
  const perStage = useMemo(() => {
    const counts = new Map<BizStage, number>();
    for (const b of businesses) counts.set(b.stage, (counts.get(b.stage) ?? 0) + 1);
    return counts;
  }, [businesses]);

  if (loading) {
    return (
      <div className="px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Local pipeline
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {businesses.length} business{businesses.length === 1 ? "" : "es"} across{" "}
          {cities.length} cit{cities.length === 1 ? "y" : "ies"}.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Tab active={stage === "all"} onClick={() => setStage("all")}>
          All <span className="tabular ml-1 text-muted/60">{businesses.length}</span>
        </Tab>
        {BIZ_STAGES.map((s) => (
          <Tab key={s} active={stage === s} onClick={() => setStage(s)}>
            {BIZ_STAGE_LABEL[s]}
            <span className="tabular ml-1 text-muted/60">{perStage.get(s) ?? 0}</span>
          </Tab>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, site, note or tag"
          className="min-w-0 flex-1 basis-56 rounded-lg border border-line-soft bg-ink px-3 py-2 text-sm placeholder:text-muted/60 focus:border-brand focus:outline-none"
        />
        <Select value={city} onChange={setCity} label="City">
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={category} onChange={setCategory} label="Category">
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select value={owner} onChange={(v) => setOwner(v as Owner)} label="Anyone">
          {(Object.keys(USER_LABEL) as UserId[]).map((id) => (
            <option key={id} value={id}>
              {USER_LABEL[id]}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold">Nothing here.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            {businesses.length === 0
              ? "Sweep a search on Prospect and the businesses land here."
              : "No business matches those filters."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((business, i) => (
            <Grouped key={business.id} business={business} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** The row plus the one thing the list view adds: whose it is, and from where. */
function Grouped({ business, index }: { business: Business; index: number }) {
  const { cityById } = useBiz();
  const city = cityById(business.city);
  return (
    <li className="flex flex-col">
      <span className="mb-1 pl-1 font-mono text-[10px] uppercase tracking-wide text-muted/60">
        {USER_LABEL[business.owner]} · {categoryLabel(business.category)} ·{" "}
        {city?.name ?? business.city}
      </span>
      <ul>
        <BizRow business={business} index={index} showAction={false} />
      </ul>
    </li>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-2.5 py-1.5 text-[11px] transition-colors ${
        active ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

/** A native select, tinted to match. `all` is the label itself, not an option. */
function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={`rounded-lg border border-line-soft bg-ink px-2.5 py-2 text-xs focus:border-brand focus:outline-none ${
        value === "all" ? "text-muted" : "text-text"
      }`}
    >
      <option value="all">{label}</option>
      {children}
    </select>
  );
}
