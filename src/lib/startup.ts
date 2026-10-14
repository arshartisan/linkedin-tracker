import { companyNameKey } from "./company";
import type { UserId } from "./types";

export const STARTUP_CHANNEL_LABEL = {
  email: "Email",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  messenger: "Messenger",
  facebook: "Facebook",
  x: "X",
  whatsapp: "WhatsApp",
  other: "Other",
} as const;

export type StartupChannel = keyof typeof STARTUP_CHANNEL_LABEL;
export type StartupDetails = {
  name: string;
  website_url: string;
  yc_url: string;
  founder_linkedin_urls: string[];
  linkedin_url: string;
  facebook_url: string;
  x_url: string;
  instagram_url: string;
  other_social_urls: string[];
  email: string;
  outreach_channels: StartupChannel[];
  note: string;
};
export type Startup = StartupDetails & { id: string; created_at: string; owner: UserId };

export const EMPTY_STARTUP: StartupDetails = {
  name: "", website_url: "", yc_url: "", founder_linkedin_urls: [],
  linkedin_url: "", facebook_url: "", x_url: "", instagram_url: "",
  other_social_urls: [], email: "", outreach_channels: [], note: "",
};

export function httpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) {
    throw new Error("Use a valid http or https link.");
  }
  return url.href;
}

// Matches startup_linkedin_key in the SQL migration, including tracking/subpages.
export function startupLinkedinKey(value: string): string {
  try {
    const url = new URL(httpUrl(value));
    if (!/^(?:[a-z]{2,3}\.)?linkedin\.com$/i.test(url.hostname)) return "";
    const match = url.pathname.match(/^\/(in|pub|company)\/([^/]+)(?:\/|$)/i);
    return match ? `${match[1]}/${match[2]}`.toLowerCase() : "";
  } catch { return ""; }
}

export function normalizeStartup(input: StartupDetails): StartupDetails {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Enter a startup name.");
  const linkedin = (value: string, founder = false) => {
    if (!value.trim()) return "";
    const key = startupLinkedinKey(value);
    if (!key || (founder && !/^(in|pub)\//.test(key))) {
      throw new Error(founder ? "Enter a valid LinkedIn profile link for each founder." : "Enter a valid LinkedIn profile or company link.");
    }
    return `https://www.linkedin.com/${key}`;
  };
  const founders = input.founder_linkedin_urls.filter((url) => url.trim()).map((url) => linkedin(url, true));
  const linkedinUrl = linkedin(input.linkedin_url);
  const keys = [...founders, linkedinUrl].filter(Boolean).map(startupLinkedinKey);
  if (new Set(keys).size !== keys.length) throw new Error("Each LinkedIn profile should appear only once.");
  const email = input.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return {
    name, email, website_url: httpUrl(input.website_url), yc_url: httpUrl(input.yc_url),
    founder_linkedin_urls: founders, linkedin_url: linkedinUrl,
    facebook_url: httpUrl(input.facebook_url), x_url: httpUrl(input.x_url), instagram_url: httpUrl(input.instagram_url),
    other_social_urls: [...new Set(input.other_social_urls.filter((url) => url.trim()).map(httpUrl))],
    outreach_channels: [...new Set(input.outreach_channels)].filter((channel) => channel in STARTUP_CHANNEL_LABEL),
    note: input.note.trim(),
  };
}

export const STARTUP_DUPLICATE_MESSAGE = "This startup name or LinkedIn profile is already tracked by the team. Use the existing startup instead.";

export function findStartupDuplicate(rows: Startup[], input: StartupDetails, excludeId?: string): Startup | undefined {
  const name = companyNameKey(input.name);
  const keys = new Set([...input.founder_linkedin_urls, input.linkedin_url].map(startupLinkedinKey).filter(Boolean));
  return rows.find((row) => row.id !== excludeId && (
    companyNameKey(row.name) === name ||
    [...row.founder_linkedin_urls, row.linkedin_url].some((url) => keys.has(startupLinkedinKey(url)))
  ));
}
