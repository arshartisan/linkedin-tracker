import type { UserId } from "./types";

export const SOP_CATEGORY_LABEL = {
  general: "General",
  linkedin: "LinkedIn",
  upwork: "Upwork",
  startups: "Startups",
  onboarding: "Onboarding",
} as const;

export type SopCategory = keyof typeof SOP_CATEGORY_LABEL;
export type SopDetails = { title: string; category: SopCategory; content: string };
/** SOPs are team documents: anyone can edit, `updated_by` records who did last. */
export type Sop = SopDetails & {
  id: string;
  created_at: string;
  updated_at: string;
  owner: UserId;
  updated_by: UserId;
};

export const EMPTY_SOP: SopDetails = { title: "", category: "general", content: "" };
export const SOP_TITLE_MAX = 160;
export const SOP_CONTENT_MAX = 500_000;
export const SOP_CONFLICT_MESSAGE = "A teammate changed this SOP while you were editing. Copy your changes, reload it, and apply them again.";

/** Tiptap leaves `<p></p>` behind in a cleared editor; treat that as no content. */
export function sopHasContent(html: string): boolean {
  return sopPlainText(html) !== "";
}

/** Strip markup for search and previews. Not a sanitiser - the editor schema is. */
export function sopPlainText(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|pre)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSop(input: SopDetails): SopDetails {
  const title = input.title.trim().replace(/\s+/g, " ");
  if (!title) throw new Error("Give the SOP a title.");
  if (title.length > SOP_TITLE_MAX) throw new Error(`Keep the title under ${SOP_TITLE_MAX} characters.`);
  if (!(input.category in SOP_CATEGORY_LABEL)) throw new Error("Choose a category.");
  const content = sopHasContent(input.content) ? input.content : "";
  if (content.length > SOP_CONTENT_MAX) throw new Error("This SOP is too long to save. Split it into smaller SOPs.");
  return { title, category: input.category, content };
}
