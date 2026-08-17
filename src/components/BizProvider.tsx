"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { bizStore } from "@/lib/biz-store";
import { storeMode } from "@/lib/supabase";
import {
  DEFAULT_CITIES,
  cellKey,
  dedupeKey,
  type BizStage,
  type Business,
  type BusinessPatch,
  type City,
  type NewBusiness,
  type Sweep,
} from "@/lib/biz";
import {
  bizCompletionPatch,
  bizStagePatch,
  buildBizQueue,
  type BizAction,
  type BizQueue,
} from "@/lib/biz-pipeline";
import { dayKey } from "@/lib/date";
import { useData } from "./DataProvider";

type Ctx = {
  /**
   * Every business the team has logged. The sweep grid and the duplicate check
   * read this - the working screens read `mine`.
   */
  businesses: Business[];
  /** The signed-in person's businesses. */
  mine: Business[];
  loading: boolean;
  error: string | null;
  /** Active cities only, in grid order. */
  cities: City[];
  /** Including retired ones, so an old business still resolves to a label. */
  allCities: City[];
  cityById: (id: string) => City | undefined;
  addCity: (city: City) => Promise<void>;
  setCityActive: (id: string, active: boolean) => Promise<void>;
  /** Swept cells, keyed by `cellKey(category, city)`. */
  sweeps: Map<string, Sweep>;
  markSwept: (category: string, city: string, found: number) => Promise<void>;
  clearSweep: (category: string, city: string) => Promise<void>;
  add: (input: Omit<NewBusiness, "owner">) => Promise<Business>;
  update: (id: string, patch: BusinessPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setStage: (business: Business, stage: BizStage) => Promise<void>;
  complete: (business: Business, action: BizAction) => Promise<void>;
  /** Every pipeline bucket for the signed-in person, derived once per change. */
  queue: BizQueue;
  /** How many businesses the team has logged in one cell of the grid. */
  countIn: (category: string, city: string) => number;
  /**
   * An earlier row for the same business, by *anyone*. Team-wide on purpose,
   * same as the LinkedIn side: two of us pitching one garage is the thing this
   * exists to prevent.
   */
  findDuplicate: (website: string, name: string, city: string) => Business | null;
  mode: typeof storeMode;
};

const BizContext = createContext<Ctx | null>(null);

export function BizProvider({ children }: { children: React.ReactNode }) {
  // Who is signed in is already solved next door; this section just borrows it
  // rather than re-reading the cookie or threading `me` through a second prop.
  const { me } = useData();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [allCities, setAllCities] = useState<City[]>(DEFAULT_CITIES);
  const [sweepRows, setSweepRows] = useState<Sweep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rollback needs the list as it was before an optimistic edit. Reading it
  // from a ref keeps `update`/`remove` stable, so the context value doesn't
  // churn on every keystroke in a row's editor.
  const latest = useRef<Business[]>(businesses);
  useEffect(() => {
    latest.current = businesses;
  }, [businesses]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([bizStore.list(), bizStore.listCities(), bizStore.listSweeps()])
      .then(([rows, cities, sweeps]) => {
        if (cancelled) return;
        setBusinesses(rows);
        setAllCities(cities);
        setSweepRows(sweeps);
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

  const add = useCallback(
    async (input: Omit<NewBusiness, "owner">) => {
      const row = await bizStore.add({ ...input, owner: me.id });
      setBusinesses((prev) => [row, ...prev]);
      return row;
    },
    [me.id]
  );

  const update = useCallback(async (id: string, patch: BusinessPatch) => {
    // Optimistic: stage chips should respond on the click, not on the round trip.
    const previous = latest.current.find((r) => r.id === id);
    setBusinesses((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    try {
      await bizStore.update(id, patch);
    } catch (e) {
      if (previous) {
        setBusinesses((prev) => prev.map((r) => (r.id === id ? previous : r)));
      }
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const snapshot = latest.current;
    setBusinesses((prev) => prev.filter((r) => r.id !== id));
    try {
      await bizStore.remove(id);
    } catch (e) {
      setBusinesses(snapshot);
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const setStage = useCallback(
    (business: Business, stage: BizStage) =>
      update(business.id, bizStagePatch(stage, business)),
    [update]
  );

  const complete = useCallback(
    (business: Business, action: BizAction) =>
      update(business.id, bizCompletionPatch(action, business)),
    [update]
  );

  // Same trick as `latest`: lets the two city mutators roll back without taking
  // `allCities` as a dependency and re-creating themselves on every change.
  const allCitiesRef = useRef<City[]>(allCities);
  useEffect(() => {
    allCitiesRef.current = allCities;
  }, [allCities]);

  const addCity = useCallback(async (city: City) => {
    const previous = allCitiesRef.current;
    setAllCities((prev) => [...prev.filter((c) => c.id !== city.id), city]);
    try {
      await bizStore.addCity(city);
    } catch (e) {
      setAllCities(previous);
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const setCityActive = useCallback(async (id: string, active: boolean) => {
    const previous = allCitiesRef.current;
    setAllCities((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
    try {
      await bizStore.setCityActive(id, active);
    } catch (e) {
      setAllCities(previous);
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const markSwept = useCallback(
    async (category: string, city: string, found: number) => {
      const row: Sweep = {
        category,
        city,
        owner: me.id,
        swept_on: dayKey(),
        found,
      };
      setSweepRows((prev) => [
        ...prev.filter((s) => !(s.category === category && s.city === city)),
        row,
      ]);
      try {
        await bizStore.markSwept(category, city, me.id, found);
      } catch (e) {
        setSweepRows((prev) =>
          prev.filter((s) => !(s.category === category && s.city === city))
        );
        setError((e as Error).message);
      }
    },
    [me.id]
  );

  const clearSweep = useCallback(async (category: string, city: string) => {
    setSweepRows((prev) =>
      prev.filter((s) => !(s.category === category && s.city === city))
    );
    try {
      await bizStore.clearSweep(category, city);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const cities = useMemo(
    () => allCities.filter((c) => c.active).sort((a, b) => a.sort - b.sort),
    [allCities]
  );

  const cityIndex = useMemo(
    () => new Map(allCities.map((c) => [c.id, c])),
    [allCities]
  );
  const cityById = useCallback((id: string) => cityIndex.get(id), [cityIndex]);

  const sweeps = useMemo(
    () => new Map(sweepRows.map((s) => [cellKey(s.category, s.city), s])),
    [sweepRows]
  );

  const mine = useMemo(
    () => businesses.filter((b) => b.owner === me.id),
    [businesses, me.id]
  );

  const today = dayKey();
  // Built from `mine`: nobody should see a teammate's follow-ups in their queue.
  const queue = useMemo(() => buildBizQueue(mine, today), [mine, today]);

  // Team-wide, because the grid is a shared map of ground already covered.
  const cellCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of businesses) {
      const key = cellKey(b.category, b.city);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [businesses]);

  const countIn = useCallback(
    (category: string, city: string) => cellCounts.get(cellKey(category, city)) ?? 0,
    [cellCounts]
  );

  const byKey = useMemo(() => {
    const map = new Map<string, Business>();
    // businesses is newest-first, so walking backwards leaves the earliest hit.
    for (let i = businesses.length - 1; i >= 0; i--) {
      const b = businesses[i];
      map.set(dedupeKey(b.website, b.name, b.city), b);
    }
    return map;
  }, [businesses]);

  const findDuplicate = useCallback(
    (website: string, name: string, city: string) => {
      if (!name.trim() && !website.trim()) return null;
      return byKey.get(dedupeKey(website, name, city)) ?? null;
    },
    [byKey]
  );

  const value = useMemo<Ctx>(
    () => ({
      businesses,
      mine,
      loading,
      error,
      cities,
      allCities,
      cityById,
      addCity,
      setCityActive,
      sweeps,
      markSwept,
      clearSweep,
      add,
      update,
      remove,
      setStage,
      complete,
      queue,
      countIn,
      findDuplicate,
      mode: storeMode,
    }),
    [
      businesses,
      mine,
      loading,
      error,
      cities,
      allCities,
      cityById,
      addCity,
      setCityActive,
      sweeps,
      markSwept,
      clearSweep,
      add,
      update,
      remove,
      setStage,
      complete,
      queue,
      countIn,
      findDuplicate,
    ]
  );

  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
}

export function useBiz(): Ctx {
  const ctx = useContext(BizContext);
  if (!ctx) throw new Error("useBiz must be used inside BizProvider");
  return ctx;
}
