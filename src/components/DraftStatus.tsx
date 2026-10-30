"use client";

import { formatTime, relativeDay, dayKey, formatShort } from "@/lib/date";

/** The quiet line under a create form saying its contents are safe, with a way to throw them away. */
export function DraftStatus({ dirty, restoredAt, onDiscard, className = "" }: {
  dirty: boolean;
  restoredAt: string | null;
  onDiscard: () => void;
  className?: string;
}) {
  if (!dirty) return null;
  const day = restoredAt ? dayKey(new Date(restoredAt)) : null;
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted ${className}`} aria-live="polite">
      <span className="size-1.5 rounded-full bg-brand/70" aria-hidden />
      {restoredAt && day
        ? `Draft restored from ${relativeDay(day)?.toLowerCase() ?? formatShort(day)}, ${formatTime(restoredAt)}. Not created yet.`
        : "Draft saved on this device. Not created yet."}
      <button type="button" onClick={onDiscard} className="font-medium text-muted underline-offset-2 transition-colors hover:text-rose hover:underline">
        Discard draft
      </button>
    </p>
  );
}
