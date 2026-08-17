/**
 * The local-business section: the domain, the search grid it is built from, and
 * the small pile of normalisation that turns "05 512 3456" written on a shop's
 * website into a link that opens WhatsApp.
 *
 * The LinkedIn side of the app tracks people you approach one at a time. This
 * side tracks a *sweep*: a fixed grid of searches ("<category> in <city>") that
 * you work through, logging what each one turns up.
 */

/**
 * A business moves through one pipeline:
 *
 *   found → researched → contacted → replied → lead
 *     ↓                       ↓         ↓
 *  unreachable          closed ← ───────┘
 *
 * `found`       logged off a search result; nothing but a name yet
 * `researched`  website and Facebook checked, a WhatsApp number captured
 * `contacted`   pitched on WhatsApp, waiting on a reply (2 follow-ups live here)
 * `replied`     they wrote back - qualify them
 * `lead`        turned into real business
 * `unreachable` researched and there is no way to reach them - a dead end, but
 *               a *different* dead end from `closed`, and worth its own stage so
 *               nobody burns another twenty minutes re-researching them
 * `closed`      not interested, or went quiet after both follow-ups
 */
export type BizStage =
  | "found"
  | "researched"
  | "contacted"
  | "replied"
  | "lead"
  | "unreachable"
  | "closed";

export const BIZ_STAGES: BizStage[] = [
  "found",
  "researched",
  "contacted",
  "replied",
  "lead",
  "unreachable",
  "closed",
];

export const BIZ_STAGE_LABEL: Record<BizStage, string> = {
  found: "Found",
  researched: "Researched",
  contacted: "Contacted",
  replied: "Replied",
  lead: "Lead",
  unreachable: "No contact",
  closed: "Closed",
};

/**
 * Same ladder as the LinkedIn chips: one hue climbing, so intensity reads as
 * progress on its own. The two dead ends leave the ramp - `closed` in full rose
 * because you decided it, `unreachable` in a muted rose because the world did.
 */
export const BIZ_STAGE_TONE: Record<BizStage, string> = {
  found: "bg-surface-2 text-muted",
  researched: "bg-surface-2 text-brand-dim",
  contacted: "bg-brand-soft text-brand-dim",
  replied: "bg-brand-soft text-brand",
  lead: "bg-brand text-ink",
  unreachable: "bg-surface-2 text-rose/70",
  closed: "bg-rose-soft text-rose",
};

/** Stages where the thread is still alive and worth counting as in-flight. */
export const BIZ_OPEN_STAGES: BizStage[] = [
  "found",
  "researched",
  "contacted",
  "replied",
];

import type { UserId } from "./types";
import { USER_IDS } from "./types";

export type Business = {
  id: string;
  created_at: string;
  /** Local calendar day you found them, as YYYY-MM-DD. */
  found_on: string;
  owner: UserId;
  name: string;
  /** A `Category.id` from CATEGORIES below. */
  category: string;
  /** A `City.id` from the cities table. */
  city: string;
  address: string;
  website: string;
  facebook: string;
  instagram: string;
  maps_url: string;
  phone: string;
  /** E.164 with a leading +. This is the one that opens WhatsApp. */
  whatsapp: string;
  email: string;
  stage: BizStage;
  note: string;
  tags: string[];
  researched_on: string | null;
  contacted_on: string | null;
  replied_on: string | null;
  lead_on: string | null;
  /** Day of the last thing *you* sent. This is what makes a follow-up due. */
  last_touch_on: string | null;
  /** How many follow-ups have gone out, 0–2. */
  followups: number;
};

/** Everything the quick-add form on the sweep grid collects. */
export type NewBusiness = {
  name: string;
  category: string;
  city: string;
  owner: UserId;
  address?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  maps_url?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  note?: string;
  tags?: string[];
  found_on?: string;
};

/** The fields the row editor and the research panel are allowed to change. */
export type BusinessPatch = Partial<
  Pick<
    Business,
    | "name"
    | "address"
    | "website"
    | "facebook"
    | "instagram"
    | "maps_url"
    | "phone"
    | "whatsapp"
    | "email"
    | "stage"
    | "note"
    | "tags"
    | "researched_on"
    | "contacted_on"
    | "replied_on"
    | "lead_on"
    | "last_touch_on"
    | "followups"
  >
>;

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

export type City = {
  id: string;
  name: string;
  /** Disambiguates the search - "Newport" alone finds the wrong one in Wales. */
  region: string;
  /** Country calling code without the +. Turns local numbers into E.164. */
  dial: string;
  sort: number;
  active: boolean;
};

/**
 * The starting three. Mirrors the seed insert in supabase/local.sql, and is
 * what the localStorage fallback runs on when Supabase isn't configured.
 */
export const DEFAULT_CITIES: City[] = [
  { id: "newport", name: "Newport", region: "Shropshire, UK", dial: "44", sort: 1, active: true },
  { id: "doha", name: "Doha", region: "Qatar", dial: "974", sort: 2, active: true },
  { id: "lusail", name: "Lusail", region: "Qatar", dial: "974", sort: 3, active: true },
];

/** What goes into the search box: "Doha, Qatar" beats a bare "Doha". */
export function citySearchName(city: City): string {
  return city.region ? `${city.name}, ${city.region}` : city.name;
}

export function citySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// The search grid
// ---------------------------------------------------------------------------

export type CategoryGroup = "Home" | "Laundry" | "Auto" | "Beauty";

export type Category = {
  id: string;
  label: string;
  group: CategoryGroup;
  /**
   * The literal searches to run for this category, `{city}` substituted. More
   * than one where the same trade is advertised under different words - a
   * Qatari "gents saloon" and a British "barbershop" are the same shop and
   * neither search finds the other.
   */
  queries: string[];
};

export const CATEGORY_GROUPS: CategoryGroup[] = ["Home", "Laundry", "Auto", "Beauty"];

export const CATEGORIES: Category[] = [
  { id: "cleaning", label: "Cleaning services", group: "Home", queries: ["cleaning services in {city}"] },
  { id: "deep-cleaning", label: "Deep cleaning", group: "Home", queries: ["deep cleaning company in {city}"] },
  { id: "maid-service", label: "Maid service", group: "Home", queries: ["maid service in {city}"] },
  { id: "pest-control", label: "Pest control", group: "Home", queries: ["pest control in {city}"] },

  { id: "laundry", label: "Laundry service", group: "Laundry", queries: ["laundry service in {city}"] },
  { id: "dry-cleaning", label: "Dry cleaning", group: "Laundry", queries: ["dry cleaning in {city}"] },
  { id: "laundry-pickup", label: "Laundry pickup", group: "Laundry", queries: ["laundry pickup delivery in {city}"] },

  { id: "car-wash", label: "Car wash", group: "Auto", queries: ["car wash in {city}"] },
  { id: "mobile-car-wash", label: "Mobile car wash", group: "Auto", queries: ["mobile car wash in {city}"] },
  { id: "auto-detailing", label: "Auto detailing", group: "Auto", queries: ["auto detailing in {city}"] },
  { id: "car-service", label: "Car service centre", group: "Auto", queries: ["car service center in {city}"] },
  { id: "auto-repair", label: "Garage / auto repair", group: "Auto", queries: ["garage in {city}", "auto repair in {city}"] },

  { id: "salon", label: "Salon", group: "Beauty", queries: ["salon in {city}", "ladies salon in {city}"] },
  { id: "barbershop", label: "Barbershop", group: "Beauty", queries: ["barbershop in {city}", "gents saloon in {city}"] },
  { id: "spa", label: "Spa", group: "Beauty", queries: ["spa in {city}"] },
  { id: "gym", label: "Gym", group: "Beauty", queries: ["gym in {city}", "fitness center in {city}"] },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryLabel(id: string): string {
  return CATEGORY_BY_ID.get(id)?.label ?? id;
}

export function findCategory(id: string): Category | undefined {
  return CATEGORY_BY_ID.get(id);
}

/** The searches for one cell of the grid, with `{city}` filled in. */
export function queriesFor(category: Category, city: City): string[] {
  const where = citySearchName(city);
  return category.queries.map((q) => q.replace("{city}", where));
}

/**
 * One row per search, with the three places worth running it. Maps is where the
 * businesses actually are; the plain Google search catches the ones with a site
 * but no listing; Facebook is where the small operators with no website live -
 * and in Doha and Lusail that is most of them.
 */
export type SearchLinks = { query: string; maps: string; google: string; facebook: string };

export function searchLinks(query: string): SearchLinks {
  const q = encodeURIComponent(query);
  return {
    query,
    maps: `https://www.google.com/maps/search/?api=1&query=${q}`,
    google: `https://www.google.com/search?q=${q}`,
    facebook: `https://www.facebook.com/search/pages/?q=${q}`,
  };
}

/**
 * The three searches that find a *specific* business's number once you have its
 * name. Run in this order they resolve most of them: the site usually has a
 * WhatsApp button, and where it doesn't the Facebook page's about section does.
 */
export function researchLinks(name: string, city: City) {
  const where = citySearchName(city);
  const q = (s: string) => encodeURIComponent(s);
  return {
    whatsapp: `https://www.google.com/search?q=${q(`"${name}" ${where} whatsapp`)}`,
    facebook: `https://www.facebook.com/search/pages/?q=${q(`${name} ${where}`)}`,
    google: `https://www.google.com/search?q=${q(`${name} ${where} contact`)}`,
  };
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/** Adds the scheme a pasted "acme.qa" is missing, so it works as an href. */
export function normaliseWebsite(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** The bare domain, which is also half the duplicate key. Mirrors the SQL. */
export function domainOf(input: string): string | null {
  const match = input
    .trim()
    .toLowerCase()
    .match(/^(?:https?:\/\/)?(?:www\.)?([^/?#]+)/);
  return match?.[1] || null;
}

/**
 * The same key the `dedupe_key` generated column computes in Postgres. Kept in
 * step with it by hand: the form checks this so it can warn *before* the insert
 * bounces off the unique index.
 */
export function dedupeKey(website: string, name: string, city: string): string {
  return domainOf(website) ?? `${name.trim().toLowerCase()}@${city.trim().toLowerCase()}`;
}

/** Shortest national number worth treating as one, before any country code. */
const MIN_LOCAL_DIGITS = 6;

/** Shortest valid E.164 number in the world, country code included. */
const MIN_E164_DIGITS = 8;

/**
 * Best effort E.164, because wa.me will not take anything else.
 *
 * A number copied off a Qatari shop's Facebook page is as likely to read
 * "+974 5512 3456" as "05512 3456" or "00974 5512 3456". `dial` is the city's
 * country code and is what lets the last two forms be resolved at all - without
 * it a bare local number is genuinely ambiguous, so it is returned as-is rather
 * than guessed at.
 */
export function toE164(input: string, dial = ""): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Keep a leading + as the one piece of punctuation that carries meaning.
  const plus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");

  // Reject fragments *before* the country code goes on. Checking only the final
  // length would let "12345" through as +97412345, which is long enough to look
  // like a number and short enough to be a typo someone half-copied.
  if (digits.length < MIN_LOCAL_DIGITS) return null;

  if (plus) {
    // Already international.
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (dial && digits.startsWith("0")) {
    // National trunk prefix: drop the 0, prepend the country code.
    digits = dial + digits.slice(1);
  } else if (dial && !digits.startsWith(dial)) {
    // A bare local number. Only safe to assume when it is too short to already
    // carry a country code of its own.
    if (digits.length <= 9) digits = dial + digits;
  }

  return digits.length >= MIN_E164_DIGITS ? `+${digits}` : null;
}

/** Renders an E.164 number with a space after the country code. */
export function formatPhone(e164: string): string {
  const m = e164.match(/^\+(\d{1,3})(\d+)$/);
  return m ? `+${m[1]} ${m[2]}` : e164;
}

/** wa.me wants digits only, no +. `text` pre-fills the message box. */
export function waLink(e164: string, text = ""): string {
  const digits = e164.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}

/** True once there is something to message. Drives `found → researched`. */
export function isReachable(b: Pick<Business, "whatsapp">): boolean {
  return Boolean(b.whatsapp.trim());
}

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

/**
 * Rows come back from Postgres, from localStorage, or from a build of this app
 * older than whichever column was added last. Everything is read through here
 * so a partial row renders instead of throwing.
 */
export function hydrateBusiness(
  row: Partial<Business> & Record<string, unknown>
): Business {
  const stage = (row.stage && BIZ_STAGES.includes(row.stage) ? row.stage : "found") as BizStage;
  const text = (v: unknown) => String(v ?? "");
  return {
    id: text(row.id),
    created_at: text(row.created_at),
    found_on: text(row.found_on),
    owner: row.owner && USER_IDS.includes(row.owner) ? row.owner : "arsh",
    name: text(row.name),
    category: text(row.category),
    city: text(row.city),
    address: text(row.address),
    website: text(row.website),
    facebook: text(row.facebook),
    instagram: text(row.instagram),
    maps_url: text(row.maps_url),
    phone: text(row.phone),
    whatsapp: text(row.whatsapp),
    email: text(row.email),
    stage,
    note: text(row.note),
    tags: Array.isArray(row.tags) ? row.tags : [],
    researched_on: row.researched_on ?? null,
    contacted_on: row.contacted_on ?? null,
    replied_on: row.replied_on ?? null,
    lead_on: row.lead_on ?? null,
    last_touch_on: row.last_touch_on ?? null,
    followups: typeof row.followups === "number" ? row.followups : 0,
  };
}

export function hydrateCity(row: Partial<City> & Record<string, unknown>): City {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    region: String(row.region ?? ""),
    dial: String(row.dial ?? ""),
    sort: typeof row.sort === "number" ? row.sort : 0,
    active: row.active !== false,
  };
}

/** One swept cell of the grid. Team-wide: a search only needs running once. */
export type Sweep = {
  category: string;
  city: string;
  owner: UserId;
  swept_on: string;
  found: number;
};

/** Composite key for the sweep map the grid reads. */
export function cellKey(category: string, city: string): string {
  return `${category}|${city}`;
}
