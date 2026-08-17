import { hasSupabase, newId, supabase } from "./supabase";
import { dayKey } from "./date";
import {
  DEFAULT_CITIES,
  hydrateBusiness,
  hydrateCategory,
  hydrateCity,
  normaliseWebsite,
  type Business,
  type BusinessPatch,
  type Category,
  type City,
  type NewBusiness,
  type Sweep,
} from "./biz";
import type { UserId } from "./types";

/**
 * Reads and writes for the local-business section, mirroring src/lib/store.ts:
 * Supabase when it is configured, browser localStorage when it isn't, same
 * shapes either way so nothing above this layer has to know which.
 */

const TABLE = "businesses";
const CITIES_TABLE = "biz_cities";
const CATEGORIES_TABLE = "biz_categories";
const SWEEPS_TABLE = "biz_sweeps";

const LOCAL_KEY = "reach.businesses.v1";
const LOCAL_CITIES_KEY = "reach.biz_cities.v1";
const LOCAL_CATEGORIES_KEY = "reach.biz_categories.v1";
const LOCAL_SWEEPS_KEY = "reach.biz_sweeps.v1";

function readLocal<T>(key: string, hydrate: (row: never) => T): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown[]).map((r) => hydrate(r as never)) : [];
  } catch {
    return [];
  }
}

function writeLocal(key: string, rows: unknown[]) {
  window.localStorage.setItem(key, JSON.stringify(rows));
}

const readLocalBusinesses = () => readLocal(LOCAL_KEY, hydrateBusiness);

/**
 * What the unique index on `dedupe_key` means in human terms. Exported so the
 * add form can recognise it and render it in the duplicate panel rather than as
 * a generic error string.
 */
export const BIZ_DUPLICATE_MESSAGE =
  "Someone on the team has already logged this business.";

/**
 * `whatsapp` is stored normalised by the caller (it needs the city's dialling
 * code, which this layer doesn't have); `website` is normalised here because a
 * pasted "acme.qa" has to grow a scheme before it can be an href *or* feed the
 * duplicate key.
 */
function buildRow(input: NewBusiness): Business {
  const now = new Date();
  return {
    id: newId(),
    created_at: now.toISOString(),
    found_on: input.found_on ?? dayKey(now),
    owner: input.owner,
    name: input.name.trim(),
    category: input.category,
    city: input.city,
    address: input.address?.trim() ?? "",
    website: normaliseWebsite(input.website ?? ""),
    facebook: normaliseWebsite(input.facebook ?? ""),
    instagram: normaliseWebsite(input.instagram ?? ""),
    maps_url: input.maps_url?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    whatsapp: input.whatsapp?.trim() ?? "",
    email: input.email?.trim() ?? "",
    // A business logged with a number already in hand skips the research lane -
    // there is nothing left to dig up.
    stage: input.whatsapp?.trim() ? "researched" : "found",
    note: input.note?.trim() ?? "",
    tags: input.tags ?? [],
    researched_on: input.whatsapp?.trim() ? (input.found_on ?? dayKey(now)) : null,
    contacted_on: null,
    replied_on: null,
    lead_on: null,
    last_touch_on: null,
    followups: 0,
  };
}

export const bizStore = {
  async list(): Promise<Business[]> {
    if (!hasSupabase) {
      return readLocalBusinesses().sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      );
    }
    const { data, error } = await supabase()
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => hydrateBusiness(r as never));
  },

  async add(input: NewBusiness): Promise<Business> {
    const row = buildRow(input);
    if (!hasSupabase) {
      const existing = readLocalBusinesses();
      writeLocal(LOCAL_KEY, [row, ...existing]);
      return row;
    }
    const { data, error } = await supabase().from(TABLE).insert(row).select().single();
    if (error) {
      // 23505 is the unique index on dedupe_key: a teammate logged this business
      // between the form's check and this insert.
      if (error.code === "23505") throw new Error(BIZ_DUPLICATE_MESSAGE);
      throw new Error(error.message);
    }
    return hydrateBusiness(data as never);
  },

  async update(id: string, patch: BusinessPatch): Promise<void> {
    if (!hasSupabase) {
      writeLocal(
        LOCAL_KEY,
        readLocalBusinesses().map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
      return;
    }
    const { error } = await supabase().from(TABLE).update(patch).eq("id", id);
    if (error) {
      // Editing a website into a row can collide just as an insert can.
      if (error.code === "23505") throw new Error(BIZ_DUPLICATE_MESSAGE);
      throw new Error(error.message);
    }
  },

  async remove(id: string): Promise<void> {
    if (!hasSupabase) {
      writeLocal(LOCAL_KEY, readLocalBusinesses().filter((r) => r.id !== id));
      return;
    }
    const { error } = await supabase().from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  /**
   * The cities the sweep grid is built from.
   *
   * An empty store is *seeded* with the starting three rather than merely
   * falling back to them. Returning them without writing them was the bug that
   * made the grid's chips look editable and not be: the three on screen existed
   * nowhere, so retiring one updated no row, adding a fourth replaced them, and
   * either way the next read handed the same three phantoms back.
   */
  async listCities(): Promise<City[]> {
    if (!hasSupabase) {
      // No window means no localStorage to seed - render the defaults and let
      // the client-side read do the writing.
      if (typeof window === "undefined") return DEFAULT_CITIES;
      const rows = readLocal(LOCAL_CITIES_KEY, hydrateCity);
      if (rows.length > 0) return rows;
      writeLocal(LOCAL_CITIES_KEY, DEFAULT_CITIES);
      return DEFAULT_CITIES;
    }
    const { data, error } = await supabase()
      .from(CITIES_TABLE)
      .select("*")
      .order("sort", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []).map((r) => hydrateCity(r as never));
    if (rows.length > 0) return rows;
    const { error: seedError } = await supabase()
      .from(CITIES_TABLE)
      .upsert(DEFAULT_CITIES);
    if (seedError) throw new Error(seedError.message);
    return DEFAULT_CITIES;
  },

  async addCity(city: City): Promise<City> {
    if (!hasSupabase) {
      const rows = readLocal(LOCAL_CITIES_KEY, hydrateCity);
      // Seed the defaults on the first write too, or adding a fourth city would
      // silently replace the three the grid was already showing.
      const base = rows.length > 0 ? rows : DEFAULT_CITIES;
      writeLocal(LOCAL_CITIES_KEY, [...base.filter((c) => c.id !== city.id), city]);
      return city;
    }
    const { data, error } = await supabase()
      .from(CITIES_TABLE)
      .upsert(city)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return hydrateCity(data as never);
  },

  /**
   * Retires rather than deletes: businesses already logged against a city keep
   * a label to render, they just stop taking up a column in the grid.
   *
   * Takes the whole city, not an id, so a row that isn't in the store yet can
   * be written rather than updated. Without that an `update ... where id = ?`
   * against a store seeded by an older build matches nothing, reports success,
   * and the chip comes back on the next load.
   */
  async setCityActive(city: City, active: boolean): Promise<void> {
    const next = { ...city, active };
    if (!hasSupabase) {
      const rows = readLocal(LOCAL_CITIES_KEY, hydrateCity);
      const base = rows.length > 0 ? rows : DEFAULT_CITIES;
      const known = base.some((c) => c.id === city.id);
      writeLocal(
        LOCAL_CITIES_KEY,
        known ? base.map((c) => (c.id === city.id ? next : c)) : [...base, next]
      );
      return;
    }
    const { error } = await supabase().from(CITIES_TABLE).upsert(next);
    if (error) throw new Error(error.message);
  },

  /**
   * Gone for good. Only offered for a city with nothing logged against it -
   * anything else retires instead, because a deleted city would leave its
   * businesses pointing at an id that resolves to nothing.
   */
  async removeCity(id: string): Promise<void> {
    if (!hasSupabase) {
      const rows = readLocal(LOCAL_CITIES_KEY, hydrateCity);
      const base = rows.length > 0 ? rows : DEFAULT_CITIES;
      writeLocal(LOCAL_CITIES_KEY, base.filter((c) => c.id !== id));
      return;
    }
    const { error } = await supabase().from(CITIES_TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  /**
   * The categories added from the picker. The sixteen built-in ones live in
   * biz.ts and are not stored - only what someone has invented since.
   */
  async listCategories(): Promise<Category[]> {
    if (!hasSupabase) return readLocal(LOCAL_CATEGORIES_KEY, hydrateCategory);
    const { data, error } = await supabase()
      .from(CATEGORIES_TABLE)
      .select("*")
      .order("sort", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => hydrateCategory(r as never));
  },

  /** Also the update path: same id upserts over the existing row. */
  async saveCategory(category: Category): Promise<Category> {
    // `custom` is derived from whether the id is one of the built-in sixteen,
    // so it is not a column - the rest of the shape is.
    const row = {
      id: category.id,
      label: category.label,
      group: category.group,
      queries: category.queries,
      sort: category.sort,
      active: category.active,
    };
    if (!hasSupabase) {
      const rows = readLocal(LOCAL_CATEGORIES_KEY, hydrateCategory);
      writeLocal(LOCAL_CATEGORIES_KEY, [
        ...rows.filter((c) => c.id !== category.id),
        row,
      ]);
      return category;
    }
    const { data, error } = await supabase()
      .from(CATEGORIES_TABLE)
      .upsert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return hydrateCategory(data as never);
  },

  async removeCategory(id: string): Promise<void> {
    if (!hasSupabase) {
      writeLocal(
        LOCAL_CATEGORIES_KEY,
        readLocal(LOCAL_CATEGORIES_KEY, hydrateCategory).filter((c) => c.id !== id)
      );
      return;
    }
    const { error } = await supabase().from(CATEGORIES_TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async listSweeps(): Promise<Sweep[]> {
    if (!hasSupabase) return readLocal(LOCAL_SWEEPS_KEY, (r) => r as Sweep);
    const { data, error } = await supabase().from(SWEEPS_TABLE).select("*");
    if (error) throw new Error(error.message);
    return (data ?? []) as Sweep[];
  },

  async markSwept(
    category: string,
    city: string,
    owner: UserId,
    found: number
  ): Promise<Sweep> {
    const row: Sweep = { category, city, owner, swept_on: dayKey(), found };
    if (!hasSupabase) {
      const rows = readLocal(LOCAL_SWEEPS_KEY, (r) => r as Sweep);
      writeLocal(LOCAL_SWEEPS_KEY, [
        ...rows.filter((s) => !(s.category === category && s.city === city)),
        row,
      ]);
      return row;
    }
    const { error } = await supabase().from(SWEEPS_TABLE).upsert(row);
    if (error) throw new Error(error.message);
    return row;
  },

  async clearSweep(category: string, city: string): Promise<void> {
    if (!hasSupabase) {
      const rows = readLocal(LOCAL_SWEEPS_KEY, (r) => r as Sweep);
      writeLocal(
        LOCAL_SWEEPS_KEY,
        rows.filter((s) => !(s.category === category && s.city === city))
      );
      return;
    }
    const { error } = await supabase()
      .from(SWEEPS_TABLE)
      .delete()
      .eq("category", category)
      .eq("city", city);
    if (error) throw new Error(error.message);
  },
};
