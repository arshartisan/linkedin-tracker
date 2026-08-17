"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
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
import {
  Card,
  Chip,
  EmptyState,
  Page,
  PageHeader,
  SectionHeading,
  Stat,
  Well,
} from "@/components/ui/layout";
import { useData } from "@/components/DataProvider";
import { AddConnect } from "@/components/AddConnect";
import { ConnectRow } from "@/components/ConnectRow";
import { Tally } from "@/components/Tally";
import { dayKey, formatLong } from "@/lib/date";
import { countsByDay, currentStreak } from "@/lib/stats";

/** The targets people actually pick. Anything else goes through "Custom". */
const GOAL_PRESETS = [10, 15, 20, 25, 30, 50];

export default function TodayPage() {
  const { mine, queue, goal, setGoal, loading, error, mode } = useData();
  const [editingGoal, setEditingGoal] = useState(false);
  const today = dayKey();

  const todays = useMemo(
    () => mine.filter((c) => c.sent_on === today),
    [mine, today]
  );
  const counts = useMemo(() => countsByDay(mine), [mine]);
  const streak = currentStreak(counts, goal);

  const sent = todays.length;
  const left = Math.max(0, goal - sent);
  const hit = sent >= goal;

  /*
    Same rule as the queue badge in the rail: only accepts still waiting on a
    first message count here. Follow-ups and replies to qualify are also due,
    but they're not what goes cold, and folding them in inflates the number
    past anything you'd act on today.
  */
  const pitches = useMemo(
    () => queue.due.filter((d) => d.action.kind === "pitch").length,
    [queue.due]
  );

  return (
    <Page>
      <PageHeader
        title="Today"
        /* Prerendered at build time, so the date only settles on the client. */
        lead={<span suppressHydrationWarning>{formatLong(today)}</span>}
        actions={
          streak > 0 ? (
            <Chip tone="brand">
              {streak} day{streak === 1 ? "" : "s"} on target
            </Chip>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {/*
            The score card. The number, the target it is measured against, and
            the tally that shows the shape of the day - one card, because they
            are one thought and splitting them makes you look in two places to
            answer a single question.
          */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="tabular flex items-baseline gap-2.5">
                <span
                  className={`font-display text-[60px] leading-none font-extrabold sm:text-[72px] ${
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
                    className="w-20 rounded-control border border-brand-edge bg-well px-2.5 py-1.5 font-mono text-lg focus:outline-none"
                  />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      title="Change the daily target"
                      aria-label={`Daily target: ${goal}`}
                      className="inline-flex items-center gap-1 rounded-full bg-well px-3 py-1.5 text-sm font-semibold text-muted outline-none transition-colors hover:text-text data-[state=open]:text-brand"
                    >
                      / {goal}
                      <ChevronDownIcon className="size-3.5 opacity-60" aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-44"
                      // "Custom…" swaps the trigger for an autofocused input, so
                      // Radix must not claw focus back to a node that just left.
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <DropdownMenuLabel className="label">
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
                            className="tabular text-xs"
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

              <p className="max-w-[46%] pb-1.5 text-right text-sm text-muted">
                {loading
                  ? "Loading your log"
                  : hit
                    ? sent === goal
                      ? "Target met. Anything now is surplus."
                      : `${sent - goal} past target.`
                    : `${left} more to hit today's target.`}
              </p>
            </div>

            <Well className="mt-5 px-4 py-4">
              <Tally count={sent} goal={goal} />
            </Well>
          </Card>

          <AddConnect />

          <section>
            <SectionHeading count={todays.length}>Sent today</SectionHeading>

            {loading ? (
              <ul className="grid gap-2 xl:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="h-[76px] animate-pulse rounded-well bg-surface" />
                ))}
              </ul>
            ) : todays.length === 0 ? (
              <EmptyState title="Nothing logged yet today.">
                Paste a profile link above the moment you send the invite - the
                tally only works if it&apos;s honest.
              </EmptyState>
            ) : (
              <ul className="grid gap-2 xl:grid-cols-2">
                {todays.map((connect, i) => (
                  <ConnectRow key={connect.id} connect={connect} index={i} />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/*
          The right rail is everything that is true *about* today without being
          part of logging it: what the day looks like in numbers, what the queue
          is holding, and anything wrong with the setup.
        */}
        <aside className="flex flex-col gap-4">
          {error && (
            <Card className="border-rose/25 bg-rose-soft/25 p-4">
              <p className="text-sm text-rose">{error}</p>
            </Card>
          )}

          {/* Sending invites is only half the job - the queue is where deals start. */}
          {pitches > 0 && (
            <Card className="p-4">
              <SectionHeading className="mb-2.5">Next up</SectionHeading>
              <Link
                href="/queue"
                className="well well-interactive flex items-center gap-3 px-4 py-3.5"
              >
                <span className="tabular font-display text-2xl font-extrabold text-brand">
                  {pitches}
                </span>
                <span className="min-w-0 flex-1 text-[13px] text-muted">
                  {pitches === 1 ? "person needs" : "people need"} an opener from
                  you
                </span>
                <span className="shrink-0 text-brand" aria-hidden>
                  →
                </span>
              </Link>
            </Card>
          )}

          <Card className="p-4">
            <SectionHeading className="mb-3">Your run</SectionHeading>
            <div className="grid grid-cols-2 gap-2">
              <Well className="px-3.5 py-3">
                <Stat
                  value={streak}
                  caption={streak === 1 ? "day on target" : "days on target"}
                  tone={streak > 0 ? "brand" : "text"}
                />
              </Well>
              <Well className="px-3.5 py-3">
                <Stat value={mine.length} caption="logged all time" />
              </Well>
            </div>
          </Card>

          {mode === "local" && (
            <Card className="p-4">
              <p className="text-xs text-muted">
                Saving to this browser only. Add your Supabase keys to sync
                across devices - see the README.
              </p>
            </Card>
          )}
        </aside>
      </div>
    </Page>
  );
}
