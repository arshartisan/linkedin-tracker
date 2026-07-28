"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useData } from "@/components/DataProvider";
import { LogoLockup } from "@/components/Logo";
import { AddConnect } from "@/components/AddConnect";
import { ConnectRow } from "@/components/ConnectRow";
import { Tally } from "@/components/Tally";
import { dayKey, formatLong } from "@/lib/date";
import { countsByDay, currentStreak } from "@/lib/stats";

/** The targets people actually pick. Anything else goes through "Custom". */
const GOAL_PRESETS = [10, 15, 20, 25, 30, 50];

export default function TodayPage() {
  const { connects, queue, goal, setGoal, loading, error, mode } = useData();
  const [editingGoal, setEditingGoal] = useState(false);
  const today = dayKey();

  const todays = useMemo(
    () => connects.filter((c) => c.sent_on === today),
    [connects, today]
  );
  const counts = useMemo(() => countsByDay(connects), [connects]);
  const streak = currentStreak(counts, goal);

  const sent = todays.length;
  const left = Math.max(0, goal - sent);
  const hit = sent >= goal;

  return (
    <div className="px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8">
        {/*
          Below md the rail is replaced by the bottom tab bar, which has no room
          for the lockup - so on mobile the page carries the mark itself.
        */}
        <LogoLockup className="mb-6 h-7 w-auto md:hidden" />

        <div className="flex items-center justify-between gap-4">
          {/* Prerendered at build time, so the date only settles on the client. */}
          <p
            suppressHydrationWarning
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted"
          >
            {formatLong(today)}
          </p>
          {streak > 0 && (
            <p className="tabular font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
              {streak} day{streak === 1 ? "" : "s"} on target
            </p>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between gap-6">
          <div className="tabular flex items-baseline gap-2">
            <span
              className={`font-display text-[64px] font-extrabold leading-none tracking-tight sm:text-[76px] ${
                hit ? "text-brand" : "text-text"
              }`}
            >
              {loading ? "-" : sent}
            </span>
            {editingGoal ? (
              <input
                type="number"
                min={1}
                max={200}
                defaultValue={goal}
                autoFocus
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) setGoal(Math.round(n));
                  setEditingGoal(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className="w-16 rounded-lg border border-brand bg-ink px-2 py-1 font-mono text-lg focus:outline-none"
              />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  title="Change the daily target"
                  aria-label={`Daily target: ${goal}`}
                  className="font-mono text-xl text-muted outline-none transition-colors hover:text-brand data-[state=open]:text-brand"
                >
                  / {goal}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-40"
                  // "Custom…" swaps the trigger for an autofocused input, so
                  // Radix must not claw focus back to a node that just left.
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Daily target
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={String(goal)}
                    onValueChange={(next) => setGoal(Number(next))}
                  >
                    {GOAL_PRESETS.map((n) => (
                      <DropdownMenuRadioItem
                        key={n}
                        value={String(n)}
                        className="tabular font-mono text-xs"
                      >
                        {n} a day
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs"
                    onSelect={() => setEditingGoal(true)}
                  >
                    Custom…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <p className="max-w-[42%] pb-2 text-right text-sm text-muted">
            {loading
              ? "Loading your log"
              : hit
                ? sent === goal
                  ? "Target met. Anything now is surplus."
                  : `${sent - goal} past target.`
                : `${left} more to hit today's target.`}
          </p>
        </div>

        <div className="mt-6">
          <Tally count={sent} goal={goal} />
        </div>
      </header>

      {error && (
        <p className="mb-5 rounded-xl border border-rose/30 bg-rose-soft/40 px-4 py-3 text-sm text-rose">
          {error}
        </p>
      )}

      {mode === "local" && (
        <p className="mb-5 rounded-xl border border-line bg-surface px-4 py-3 text-xs text-muted">
          Saving to this browser only. Add your Supabase keys to sync across
          devices - see the README.
        </p>
      )}

      {/* Sending invites is only half the job - the queue is where deals start. */}
      {queue.due.length > 0 && (
        <Link
          href="/queue"
          className="mb-5 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft/40 px-4 py-3 text-sm transition-colors hover:border-brand/60"
        >
          <span className="tabular font-display text-lg font-bold text-brand">
            {queue.due.length}
          </span>
          <span className="text-brand/90">
            {queue.due.length === 1 ? "person needs" : "people need"} a message
            from you
          </span>
          <span className="ml-auto text-brand">→</span>
        </Link>
      )}

      <AddConnect />

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Sent today
          {todays.length > 0 && (
            <span className="tabular ml-2 text-muted/60">{todays.length}</span>
          )}
        </h2>

        {loading ? (
          <ul className="grid gap-2 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="h-[70px] animate-pulse rounded-xl border border-line-soft bg-surface"
              />
            ))}
          </ul>
        ) : todays.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
            <p className="font-display text-lg font-semibold">
              Nothing logged yet today.
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
              Paste a profile link above the moment you send the invite - the
              tally only works if it&apos;s honest.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {todays.map((connect, i) => (
              <ConnectRow key={connect.id} connect={connect} index={i} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
