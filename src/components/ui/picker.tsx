"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, PlusIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A searchable dropdown that can also *create* the thing you were looking for.
 *
 * Both lists this app picks from - business types and cities - are open-ended:
 * you find out you need "tyre shops in Al Wakra" while you are halfway through
 * logging one. A plain <select> would send you off to a settings screen and
 * lose the form you were filling in, so the create lives in the same panel as
 * the search, one keystroke from the query you already typed.
 */

export type PickerOption = {
  value: string;
  label: string;
  /** Quiet text after the label - a region, a group, a count. */
  hint?: string;
  /** Options are rendered under their group heading, in first-seen order. */
  group?: string;
};

/** What the create panel is handed: the text typed, and the two ways out. */
export type PickerCreate = {
  query: string;
  /** Selects the new value and closes. */
  done: (value: string) => void;
  cancel: () => void;
};

export function Picker({
  label,
  options,
  value,
  onChange,
  placeholder = "Choose…",
  searchPlaceholder = "Search…",
  createLabel = "Create",
  renderCreate,
  className,
  disabled = false,
}: {
  /** Accessible name, and the caption above the control. */
  label: string;
  options: PickerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Prefix on the create row: `Add "tyre shops"`. */
  createLabel?: string;
  /** Omit and the picker is a plain search - no create row is offered. */
  renderCreate?: (create: PickerCreate) => React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint ?? "").toLowerCase().includes(q)
    );
  }, [options, query]);

  // Group headings only earn their space once there is more than one group.
  const groups = useMemo(() => {
    const out: { name: string; items: PickerOption[] }[] = [];
    for (const option of matches) {
      const name = option.group ?? "";
      const last = out.find((g) => g.name === name);
      if (last) last.items.push(option);
      else out.push({ name, items: [option] });
    }
    return out;
  }, [matches]);

  function close() {
    setOpen(false);
    setQuery("");
    setCreating(false);
  }

  // Clicking anywhere else closes it - including inside another picker, which
  // is why this is a document listener rather than a blur on the panel.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && !creating) searchRef.current?.focus();
  }, [open, creating]);

  const canCreate =
    Boolean(renderCreate) &&
    // Nothing to create when the search already names something exactly.
    !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        className={cn(
          "flex w-full items-center gap-2 rounded-control border border-line-soft bg-well px-3.5 py-2.5 text-left text-sm transition-colors",
          open ? "border-brand-edge" : "hover:border-line",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <span className="font-medium">{selected.label}</span>
              {selected.hint && (
                <span className="ml-1.5 text-xs text-muted/70">{selected.hint}</span>
              )}
            </>
          ) : (
            <span className="text-muted/60">{placeholder}</span>
          )}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 text-muted transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="fade-in absolute z-30 mt-1.5 w-full min-w-[15rem] overflow-hidden rounded-card border border-line-soft bg-surface shadow-raised">
          {creating ? (
            <div className="p-3">
              {renderCreate?.({
                query,
                done: (next) => {
                  onChange(next);
                  close();
                },
                cancel: () => setCreating(false),
              })}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
                <SearchIcon className="size-3.5 shrink-0 text-muted/60" aria-hidden />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter takes the single remaining match, or opens the
                    // create panel when the search found nothing.
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    if (matches.length === 1) {
                      onChange(matches[0].value);
                      close();
                    } else if (matches.length === 0 && canCreate) {
                      setCreating(true);
                    }
                  }}
                  placeholder={searchPlaceholder}
                  aria-label={`Search ${label.toLowerCase()}`}
                  className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted/60 focus:outline-none"
                />
              </div>

              <ul
                id={listId}
                role="listbox"
                aria-label={label}
                className="max-h-64 overflow-y-auto py-1"
              >
                {groups.map((group) => (
                  <li key={group.name || "_"}>
                    {group.name && groups.length > 1 && (
                      <div className="label px-3 pt-2 pb-1 text-[10px] text-muted/50">
                        {group.name}
                      </div>
                    )}
                    <ul>
                      {group.items.map((option) => {
                        const active = option.value === value;
                        return (
                          <li key={option.value}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={active}
                              onClick={() => {
                                onChange(option.value);
                                close();
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                                active
                                  ? "bg-brand-soft text-brand"
                                  : "text-text hover:bg-well"
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {option.label}
                                {option.hint && (
                                  <span className="ml-1.5 text-xs text-muted/70">
                                    {option.hint}
                                  </span>
                                )}
                              </span>
                              {active && (
                                <CheckIcon className="size-3.5 shrink-0" aria-hidden />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}

                {matches.length === 0 && (
                  <li className="px-3 py-2.5 text-xs text-muted/60">
                    Nothing matches “{query}”.
                  </li>
                )}
              </ul>

              {canCreate && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-1.5 border-t border-line-soft px-3 py-2.5 text-left text-xs font-semibold text-muted transition-colors hover:text-brand"
                >
                  <PlusIcon className="size-3.5 shrink-0" aria-hidden />
                  {query.trim() ? (
                    <>
                      {createLabel} “<span className="text-text">{query.trim()}</span>”
                    </>
                  ) : (
                    <>{createLabel} a new one</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** The caption a picker wears inside a form row. */
export function PickerField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="label mb-1.5 text-[10px] text-muted/60">{label}</div>
      {children}
    </div>
  );
}
