"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { store, storeMode, type ConnectPatch } from "@/lib/store";
import type { Connect, NewConnect, Stage } from "@/lib/types";
import { profileSlug } from "@/lib/linkedin";
import { getGoal, getServerGoal, subscribeGoal, writeGoal } from "@/lib/goal";
import {
  buildQueue,
  completionPatch,
  stagePatch,
  type Action,
  type Queue,
} from "@/lib/pipeline";
import { dayKey } from "@/lib/date";

type Ctx = {
  connects: Connect[];
  loading: boolean;
  error: string | null;
  goal: number;
  setGoal: (n: number) => void;
  add: (input: NewConnect) => Promise<Connect>;
  update: (id: string, patch: ConnectPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Move someone along the pipeline, stamping the milestone day. */
  setStage: (connect: Connect, stage: Stage) => Promise<void>;
  /** Finish the queued action for someone in one click. */
  complete: (connect: Connect, action: Action) => Promise<void>;
  /** Every pipeline bucket, derived once per change to `connects`. */
  queue: Queue;
  /** Earlier connect to the same profile, if this person is already logged. */
  findDuplicate: (url: string) => Connect | null;
  mode: typeof storeMode;
};

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [connects, setConnects] = useState<Connect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const goal = useSyncExternalStore(subscribeGoal, getGoal, getServerGoal);

  // Rollback needs the list as it was before an optimistic edit. Reading it
  // from a ref (rather than a dependency) keeps `update`/`remove` stable, so
  // the context value doesn't churn on every keystroke.
  const latest = useRef<Connect[]>(connects);
  useEffect(() => {
    latest.current = connects;
  }, [connects]);

  useEffect(() => {
    let cancelled = false;
    store
      .list()
      .then((rows) => {
        if (!cancelled) setConnects(rows);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setGoal = useCallback((n: number) => writeGoal(n), []);

  const add = useCallback(async (input: NewConnect) => {
    const row = await store.add(input);
    setConnects((prev) => [row, ...prev]);
    return row;
  }, []);

  const update = useCallback(async (id: string, patch: ConnectPatch) => {
    // Optimistic: stage chips should respond on the click, not on the round trip.
    const previous = latest.current.find((r) => r.id === id);
    setConnects((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
    try {
      await store.update(id, patch);
    } catch (e) {
      if (previous) setConnects((prev) => prev.map((r) => (r.id === id ? previous : r)));
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const snapshot = latest.current;
    setConnects((prev) => prev.filter((r) => r.id !== id));
    try {
      await store.remove(id);
    } catch (e) {
      setConnects(snapshot);
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const setStage = useCallback(
    (connect: Connect, stage: Stage) =>
      update(connect.id, stagePatch(stage, connect)),
    [update]
  );

  const complete = useCallback(
    (connect: Connect, action: Action) =>
      update(connect.id, completionPatch(action, connect)),
    [update]
  );

  const today = dayKey();
  const queue = useMemo(() => buildQueue(connects, today), [connects, today]);

  const bySlug = useMemo(() => {
    const map = new Map<string, Connect>();
    // connects is newest-first, so walking backwards leaves the earliest hit.
    for (let i = connects.length - 1; i >= 0; i--) {
      const slug = profileSlug(connects[i].profile_url);
      if (slug) map.set(slug, connects[i]);
    }
    return map;
  }, [connects]);

  const findDuplicate = useCallback(
    (url: string) => {
      const slug = profileSlug(url);
      return slug ? bySlug.get(slug) ?? null : null;
    },
    [bySlug]
  );

  const value = useMemo<Ctx>(
    () => ({
      connects,
      loading,
      error,
      goal,
      setGoal,
      add,
      update,
      remove,
      setStage,
      complete,
      queue,
      findDuplicate,
      mode: storeMode,
    }),
    [
      connects,
      loading,
      error,
      goal,
      setGoal,
      add,
      update,
      remove,
      setStage,
      complete,
      queue,
      findDuplicate,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
