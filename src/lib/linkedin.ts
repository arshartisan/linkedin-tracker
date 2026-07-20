/**
 * LinkedIn profile URLs come in a lot of shapes when pasted from the app,
 * from search results, or from a share sheet. Normalising them is what makes
 * duplicate detection work — /in/jane-doe-12ab/ and the same link with
 * ?miniProfileUrn=… are the same person.
 */

const PROFILE_RE = /linkedin\.com\/(?:in|pub)\/([^/?#]+)/i;

export function isLinkedInUrl(input: string): boolean {
  return PROFILE_RE.test(input.trim());
}

/** Stable key for one person: their profile slug, lowercased. */
export function profileSlug(input: string): string | null {
  const match = input.trim().match(PROFILE_RE);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return match[1].toLowerCase();
  }
}

/** Strips tracking params and trailing slashes down to the canonical profile. */
export function normaliseUrl(input: string): string {
  const slug = profileSlug(input);
  if (!slug) return input.trim();
  return `https://www.linkedin.com/in/${slug}`;
}

/**
 * Best-effort display name from a slug: LinkedIn slugs are usually
 * "first-last" with a random suffix, e.g. "jane-doe-8b41a220".
 */
export function nameFromUrl(input: string): string {
  const slug = profileSlug(input);
  if (!slug) return "";
  return slug
    .split("-")
    // Drop the hash-like suffix LinkedIn appends to disambiguate.
    .filter((part) => !/^[0-9a-f]{4,}$/i.test(part) && !/^\d+$/.test(part))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .trim();
}

/** Splits "saas, founder,  berlin" into clean tags. */
export function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}
