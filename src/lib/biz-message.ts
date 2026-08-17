/**
 * The WhatsApp copy.
 *
 * These are starting points, not a send-as-is script - the queue drops the
 * filled-in text into a textarea you edit before the link opens, so a template
 * that is 80% right is worth more than none at all. Rewrite them here once you
 * know what actually lands; every row picks them up.
 *
 * Placeholders: {name} {category} {city} {me}
 */

import { categoryLabel, type Business, type City } from "./biz";

export type TemplateVars = {
  name: string;
  category: string;
  city: string;
  me: string;
};

export const OPENER =
  "Hi {name} 👋\n\n" +
  "I came across your {category} in {city} and had a quick look at how you're " +
  "showing up online.\n\n" +
  "I spotted a couple of things that are probably costing you enquiries - happy " +
  "to send them over, no charge either way.\n\n" +
  "Worth a look?\n\n— {me}";

/**
 * Two follow-ups, deliberately different in kind. The first assumes the message
 * was missed; the second assumes it wasn't and gives them a clean way out,
 * which is what actually gets a reply out of the ones still thinking about it.
 */
export const FOLLOWUPS: string[] = [
  "Hi {name}, just floating this back up in case it got buried 🙂 " +
    "Still happy to send over what I found for your {city} listing.",
  "Hi {name} - I'll leave it here so I'm not cluttering your inbox. " +
    "If it's not the right time, no problem at all; just reply STOP and I won't " +
    "follow up again. If you'd like the notes, say the word.\n\n— {me}",
];

/** The reply-to-a-reply nudge, offered on the qualify step. */
export const QUALIFY =
  "Great to hear from you, {name}! Are you free for a quick 10-minute call this " +
  "week? Happy to walk you through what I found.";

export function fill(template: string, vars: TemplateVars): string {
  return template
    .replaceAll("{name}", vars.name)
    .replaceAll("{category}", vars.category)
    .replaceAll("{city}", vars.city)
    .replaceAll("{me}", vars.me);
}

export function varsFor(business: Business, city: City | undefined, me: string): TemplateVars {
  return {
    name: business.name,
    // Lowercased: "your cleaning services in Doha" reads as a sentence, where
    // the grid's Title Case would read as a label pasted into one.
    category: categoryLabel(business.category).toLowerCase(),
    city: city?.name ?? business.city,
    me,
  };
}

/**
 * The message that belongs with whatever the queue is asking for. Follow-ups
 * are indexed by how many have already gone out, and clamp to the last one so
 * a row with a stale counter still produces text.
 */
export function messageFor(
  kind: "pitch" | "followup" | "qualify",
  business: Business,
  vars: TemplateVars
): string {
  if (kind === "pitch") return fill(OPENER, vars);
  if (kind === "qualify") return fill(QUALIFY, vars);
  const index = Math.min(business.followups, FOLLOWUPS.length - 1);
  return fill(FOLLOWUPS[index], vars);
}
