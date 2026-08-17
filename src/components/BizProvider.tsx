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
  BUILTIN_CATEGORY_GROUPS,
  DEFAULT_CITIES,
  cellKey,
  citySlug,
  dedupeKey,
  makeCategory,
  mergeCategories,
  registerCategories,
  type BizStage,
  type Business,
  type BusinessPatch,
  type Category,
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
  /** Creates or overwrites. Returns the stored city, id included. */
  addCity: (input: { name: string; region: string; dial: string }) => Promise<City>;
  setCityActive: (id: string, active: boolean) => Promise<void>;
  /** Hard delete. Refuses while anything is logged against the city. */
  removeCity: (id: string) => Promise<void>;
  /** Active categories, built-in and added, in grid order. */
  categories: Category[];
  /** Including retired ones. */
  allCategories: Category[];
  categoryById: (id: string) => Category | undefined;
  addCategory: (input: { label: string; group: string }) => Promise<Category>;
  setCategoryActive: (id: string, active: boolean) => Promise<void>;
  /** Hard delete. Refuses while anything is logged against the category. */
  removeCategory: (id: string) => Promise<void>;
  /** Category groups in grid order, invented ones included. */
  categoryGroups: string[];
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
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
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
    Promise.all([
      bizStore.list(),
      bizStore.listCities(),
      // Tolerated rather than awaited strictly: a Supabase project set up
      // before biz_categories existed should still load its businesses, just
      // with the built-in category list.
      bizStore.listCategories().catch(() => [] as Category[]),
      bizStore.listSweeps(),
    ])
      .then(([rows, cities, categories, sweeps]) => {
        if (cancelled) return;
        setBusinesses(rows);
        setAllCities(cities);
        setCustomCategories(categories);
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

  /**
   * Adding a city the grid already has - typed again, or retired earlier and
   * typed back in - reactivates it instead of writing a second row over the
   * top, which is what the id being a slug of the name would otherwise do.
   */
  const addCity = useCallback(
    async (input: { name: string; region: string; dial: string }) => {
      const name = input.name.trim();
      const id = citySlug(name);
      const existing = allCitiesRef.current.find((c) => c.id === id);
      const city: City = {
        id,
        name,
        region: input.region.trim(),
        dial: input.dial.replace(/\D/g, ""),
        // Off the end of the list, not off its length: retiring a city and
        // adding another would otherwise hand out a sort that is already taken.
        sort:
          existing?.sort ??
          allCitiesRef.current.reduce((max, c) => Math.max(max, c.sort), 0) + 1,
        active: true,
      };
      const previous = allCitiesRef.current;
      setAllCities((prev) => [...prev.filter((c) => c.id !== id), city]);
      try {
        return await bizStore.addCity(city);
      } catch (e) {
        setAllCities(previous);
        setError((e as Error).message);
        throw e;
      }
    },
    []
  );

  const setCityActive = useCallback(async (id: string, active: boolean) => {
    const previous = allCitiesRef.current;
    const city = previous.find((c) => c.id === id);
    if (!city) return;
    setAllCities((prev) => prev.map((c) => (c.id === id ? { ...c, active } : c)));
    try {
      // The whole city, so a row the store has never seen gets written rather
      // than a no-op update that reports success and changes nothing.
      await bizStore.setCityActive(city, active);
    } catch (e) {
      setAllCities(previous);
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const removeCity = useCallback(async (id: string) => {
    const previous = allCitiesRef.current;
    setAllCities((prev) => prev.filter((c) => c.id !== id));
    try {
      await bizStore.removeCity(id);
    } catch (e) {
      setAllCities(previous);
      setError((e as Error).message);
      throw e;
    }
  }, []);

  // Same ref trick again, for the same reason.
  const customCategoriesRef = useRef<Category[]>(customCategories);
  useEffect(() => {
    customCategoriesRef.current = customCategories;
  }, [customCategories]);

  const allCategories = useMemo(
    () => mergeCategories(customCategories).sort((a, b) => a.sort - b.sort),
    [customCategories]
  );

  // The three places that resolve a category id with no provider to read from
  // get told about the added ones as soon as they load.
  useEffect(() => {
    registerCategories(allCategories);
  }, [allCategories]);

  const allCategoriesRef = useRef<Category[]>(allCategories);
  useEffect(() => {
    allCategoriesRef.current = allCategories;
  }, [allCategories]);

  /**
   * Writes a row for a category. Built-in ones have no row until something
   * about them changes - retiring one writes an override, and deleting that
   * override is what restores it.
   */
  const saveCategory = useCallback(async (category: Category) => {
    const previous = customCategoriesRef.current;
    setCustomCategories((prev) => [
      ...prev.filter((c) => c.id !== category.id),
      category,
    ]);
    try {
      return await bizStore.saveCategory(category);
    } catch (e) {
      setCustomCategories(previous);
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const addCategory = useCallback(
    async (input: { label: string; group: string }) => {
      const id = citySlug(input.label);
      const existing = allCategoriesRef.current.find((c) => c.id === id);
      const sort =
        existing?.sort ??
        allCategoriesRef.current.reduce((max, c) => Math.max(max, c.sort), 0) + 1;
      const category = existing
        ? { ...existing, group: input.group.trim() || existing.group, active: true }
        : makeCategory(input.label, input.group, sort);
      await saveCategory(category);
      return category;
    },
    [saveCategory]
  );

  const setCategoryActive = useCallback(
    async (id: string, active: boolean) => {
      const category = allCategoriesRef.current.find((c) => c.id === id);
      if (!category) return;
      await saveCategory({ ...category, active });
    },
    [saveCategory]
  );

  const removeCategory = useCallback(async (id: string) => {
    const previous = customCategoriesRef.current;
    setCustomCategories((prev) => prev.filter((c) => c.id !== id));
    try {
      await bizStore.removeCategory(id);
    } catch (e) {
      setCustomCategories(previous);
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

  const categories = useMemo(
    () => allCategories.filter((c) => c.active),
    [allCategories]
  );

  const categoryIndex = useMemo(
    () => new Map(allCategories.map((c) => [c.id, c])),
    [allCategories]
  );
  const categoryById = useCallback(
    (id: string) => categoryIndex.get(id),
    [categoryIndex]
  );

  // Built-in groups first and in their declared order, then any that an added
  // category invented - so the grid's familiar blocks don't reshuffle.
  const categoryGroups = useMemo(() => {
    const seen = new Set(BUILTIN_CATEGORY_GROUPS);
    const extra = categories.map((c) => c.group).filter((g) => !seen.has(g));
    return [...BUILTIN_CATEGORY_GROUPS, ...new Set(extra)];
  }, [categories]);

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
      removeCity,
      categories,
      allCategories,
      categoryById,
      addCategory,
      setCategoryActive,
      removeCategory,
      categoryGroups,
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
      removeCity,
      categories,
      allCategories,
      categoryById,
      addCategory,
      setCategoryActive,
      removeCategory,
      categoryGroups,
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
