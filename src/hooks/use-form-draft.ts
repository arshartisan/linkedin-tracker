"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/*
  Unfinished create forms live on this device until the record is created.
  Each form keeps its own state; this hook only mirrors a snapshot of it into
  localStorage on every change and hands it back the next time the form opens.
  Keys include the user, so two people sharing a machine never see each
  other's drafts.
*/

const PREFIX = "reach.draft.v1.";
type Stored<T> = { at: string; value: T };

export function draftKey(user: string, form: string): string {
  return `${PREFIX}${user}.${form}`;
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse<T>(raw: string | null): Stored<T> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Stored<T>;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify({ at: new Date().toISOString(), value }));
  } catch {
    // Storage full or blocked: the form still works, it just won't survive a reload.
  }
}

/** For "Resume draft" buttons that sit outside the form. Client-only. */
export function hasDraft(key: string): boolean {
  return parse(readRaw(key)) !== null;
}

// Only the first read per key matters, so there is nothing to subscribe to.
const subscribe = () => () => {};

/**
 * Whether a form outside the current view has a draft waiting, for a "Resume
 * draft" label. Re-read on every render; false until hydrated.
 */
export function useHasDraft(key: string): boolean {
  return useSyncExternalStore(subscribe, () => hasDraft(key), () => false);
}

export function useFormDraft<T extends object>({ key, value, empty, restore }: {
  /** `null` turns drafting off, e.g. while the same form edits an existing record. */
  key: string | null;
  value: T;
  empty: T;
  restore: (saved: T) => void;
}) {
  // `undefined` on the server and during hydration: storage hasn't been read yet.
  const raw = useSyncExternalStore(subscribe, () => (key ? readRaw(key) : null), () => undefined);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const [restored, setRestored] = useState<{ at: string; snapshot: string } | null>(null);
  const serialized = JSON.stringify(value);
  const blank = JSON.stringify(empty);

  // Pull the saved draft into the form once per key, during render, so the
  // first commit already shows it and the write below never sees a blank form.
  if (key !== appliedKey && raw !== undefined) {
    setAppliedKey(key);
    const stored = key ? parse<T>(raw) : null;
    if (stored) {
      const merged = { ...empty, ...stored.value };
      restore(merged);
      setRestored({ at: stored.at, snapshot: JSON.stringify(merged) });
    } else {
      setRestored(null);
    }
  }

  useEffect(() => {
    // Wait for the read above, or the blank first render would erase the draft.
    if (!key || key !== appliedKey) return;
    // Back to blank (created, reset or discarded) means there is nothing left to keep.
    write(key, serialized === blank ? null : JSON.parse(serialized));
  }, [key, appliedKey, serialized, blank]);

  return {
    /** When the restored draft was saved, until the form is changed again. */
    restoredAt: restored && restored.snapshot === serialized ? restored.at : null,
    /** True while the form holds anything worth keeping. */
    dirty: key !== null && serialized !== blank,
    discard() {
      if (key) write(key, null);
      setRestored(null);
      restore(empty);
    },
    /** For forms that close on create instead of resetting: drop the stored copy. */
    clear() {
      if (key) write(key, null);
    },
  };
}
