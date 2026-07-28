"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { useData } from "@/components/DataProvider";
import { ConnectRow } from "@/components/ConnectRow";
import { Tally } from "@/components/Tally";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatLong, relativeDay } from "@/lib/date";
import { STAGES, STAGE_LABEL, type Stage } from "@/lib/types";
import type { Connect } from "@/lib/types";

type Filter = "all" | Stage;

const FILTER_LABEL: Record<Filter, string> = {
  all: "All stages",
  ...STAGE_LABEL,
};

const PAGE_SIZES = [10, 25, 50] as const;

/**
 * First page, last page and a window around the current one. Anything skipped
 * collapses to a single ellipsis so the control never outgrows its row.
 */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) out.push("gap");
    out.push(page);
    previous = page;
  }
  return out;
}

export default function HistoryPage() {
  const { connects, goal, loading } = useData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pageSize, setPageSize] = useState<number>(25);

  /**
   * Changing the search, the stage or the page size makes page 5 meaningless,
   * so the page number is stored against the query it belongs to and falls
   * back to 1 the moment that query changes.
   */
  const signature = JSON.stringify([query, filter, pageSize]);
  const [paging, setPaging] = useState({ signature, page: 1 });
  const page = paging.signature === signature ? paging.page : 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return connects.filter((c) => {
      if (filter !== "all" && c.stage !== filter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.profile_url.toLowerCase().includes(q) ||
        c.note.toLowerCase().includes(q) ||
        c.tags.some((t) => t.includes(q))
      );
    });
  }, [connects, query, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Deleting rows can shrink the list under you while you sit on the last page.
  const current = Math.min(page, pageCount);

  const start = (current - 1) * pageSize;
  const pageRows = useMemo(
    () => filtered.slice(start, start + pageSize),
    [filtered, start, pageSize]
  );

  /** Day totals come from the whole result set - a day split across two pages
   *  should still report how many connects it really holds. */
  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) map.set(c.sent_on, (map.get(c.sent_on) ?? 0) + 1);
    return map;
  }, [filtered]);

  const days = useMemo(() => {
    const map = new Map<string, Connect[]>();
    for (const c of pageRows) {
      const list = map.get(c.sent_on);
      if (list) list.push(c);
      else map.set(c.sent_on, [c]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [pageRows]);

  const goTo = (next: number) =>
    setPaging({ signature, page: Math.min(Math.max(next, 1), pageCount) });

  return (
    <div className="px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          History
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every connect you&apos;ve logged, newest first. Search before you send
          to avoid doubling up.
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-5 mb-5 bg-ink/90 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, link, note or tag"
            aria-label="Search connects"
            className="flex-1 rounded-xl border border-line-soft bg-surface px-4 py-2.5 text-sm placeholder:text-muted/70 focus:border-brand focus:outline-none"
          />

          <div className="flex gap-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex flex-1 items-center justify-between gap-2 rounded-xl border border-line-soft bg-surface px-3.5 py-2.5 text-sm text-muted outline-none transition-colors hover:text-text data-[state=open]:text-text sm:flex-none">
                {FILTER_LABEL[filter]}
                <ChevronDownIcon className="size-3.5 opacity-70" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Filter by stage
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={filter}
                  onValueChange={(next) => setFilter(next as Filter)}
                >
                  {(["all", ...STAGES] as Filter[]).map((f) => (
                    <DropdownMenuRadioItem key={f} value={f} className="text-xs">
                      {FILTER_LABEL[f]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl border border-line-soft bg-surface px-3.5 py-2.5 font-mono text-xs text-muted outline-none transition-colors hover:text-text data-[state=open]:text-text">
                {pageSize} / page
                <ChevronDownIcon className="size-3.5 opacity-70" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Rows per page
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={String(pageSize)}
                  onValueChange={(next) => setPageSize(Number(next))}
                >
                  {PAGE_SIZES.map((size) => (
                    <DropdownMenuRadioItem
                      key={size}
                      value={String(size)}
                      className="text-xs"
                    >
                      {size} per page
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-lg font-semibold">
            {connects.length === 0 ? "No connects logged yet." : "No matches."}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            {connects.length === 0
              ? "Log your first one on the Today screen."
              : "Try a different name, tag or status."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {days.map(([day, rows]) => {
              const total = dayTotals.get(day) ?? rows.length;
              return (
                <section key={day}>
                  <div className="mb-3 flex items-center gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-sm font-bold">
                        {relativeDay(day) ?? formatLong(day)}
                      </h2>
                      <p className="tabular font-mono text-[11px] text-muted">
                        {total} of {goal}
                        {rows.length !== total && ` · ${rows.length} here`}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Tally count={total} goal={goal} compact />
                    </div>
                  </div>
                  <ul className="grid gap-2 lg:grid-cols-2">
                    {rows.map((connect, i) => (
                      <ConnectRow key={connect.id} connect={connect} index={i} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 border-t border-line-soft pt-6">
            <p className="tabular font-mono text-[11px] text-muted">
              {start + 1}–{start + pageRows.length} of {filtered.length}
            </p>

            {pageCount > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={current === 1}
                      className={
                        current === 1
                          ? "pointer-events-none opacity-40"
                          : undefined
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        goTo(current - 1);
                      }}
                    />
                  </PaginationItem>

                  {pageWindow(current, pageCount).map((entry, i) =>
                    entry === "gap" ? (
                      <PaginationItem key={`gap-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={entry}>
                        <PaginationLink
                          href="#"
                          isActive={entry === current}
                          className="tabular font-mono text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            goTo(entry);
                          }}
                        >
                          {entry}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={current === pageCount}
                      className={
                        current === pageCount
                          ? "pointer-events-none opacity-40"
                          : undefined
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        goTo(current + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </>
      )}
    </div>
  );
}
