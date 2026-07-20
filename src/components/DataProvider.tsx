"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { store, storeMode, type ConnectPatch } from "@/lib/store";
import type { Connect, NewConnect } from "@/lib/types";
import { profileSlug } from "@/lib/linkedin";
import { getGoal, getServerGoal, subscribeGoal, writeGoal } from "@/lib/goal";

type Ctx = {
  connects: Connect[];
  loading: boolean;
  error: string | null;
  goal: number;
  setGoal: (n: number) => void;
  add: (input: NewConnect) => Promise<Connect>;
  update: (id: string, patch: ConnectPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
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
    // Optimistic: status chips should respond on the click, not on the round trip.
    let previous: Connect | undefined;
    setConnects((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        previous = r;
        return { ...r, ...patch };
      })
    );
    try {
      await store.update(id, patch);
    } catch (e) {
      if (previous) setConnects((prev) => prev.map((r) => (r.id === id ? previous! : r)));
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const snapshot = connects;
    setConnects((prev) => prev.filter((r) => r.id !== id));
    try {
      await store.remove(id);
    } catch (e) {
      setConnects(snapshot);
      setError((e as Error).message);
      throw e;
    }
  }, [connects]);

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
      findDuplicate,
      mode: storeMode,
    }),
    [connects, loading, error, goal, setGoal, add, update, remove, findDuplicate]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
