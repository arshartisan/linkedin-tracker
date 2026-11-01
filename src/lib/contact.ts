import { httpUrl } from "./startup";
import type { UserId } from "./types";

/*
  Common leads: anyone worth keeping in touch with, wherever they came from.
  The email address is the record's identity - one person, one row, across the
  whole team - so it is stored normalised (trimmed, lowercase) and doubles as
  the primary key in the database.
*/

export type ContactDetails = {
  name: string;
  email: string;
  phone: string;
  country: string;
  social_url: string;
};
export type Contact = ContactDetails & { created_at: string; owner: UserId };

export const EMPTY_CONTACT: ContactDetails = { name: "", email: "", phone: "", country: "", social_url: "" };

/** Matches the `contacts_email_valid` check in the SQL migration. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function contactEmailKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Digits, spaces and the usual separators, with an optional leading +. */
export function normalizePhone(value: string): string {
  const phone = value.trim().replace(/\s+/g, " ");
  if (!phone) return "";
  if (!/^\+?[\d\s().-]+$/.test(phone)) throw new Error("Enter a phone number using digits, spaces, +, -, or brackets.");
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15) throw new Error("A phone number should have between 7 and 15 digits.");
  return phone;
}

export function normalizeContact(input: ContactDetails): ContactDetails {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Enter a name.");
  const email = contactEmailKey(input.email);
  if (!email) throw new Error("Enter an email address.");
  if (!EMAIL.test(email)) throw new Error("Enter a valid email address.");
  return {
    name,
    email,
    phone: normalizePhone(input.phone),
    country: input.country.trim().replace(/\s+/g, " "),
    social_url: httpUrl(input.social_url),
  };
}

export const CONTACT_DUPLICATE_MESSAGE = "This email is already saved by the team. Use the existing contact instead.";

/** `currentEmail` is the stored key of the contact being edited, if any. */
export function findContactDuplicate(rows: Contact[], email: string, currentEmail?: string): Contact | undefined {
  const key = contactEmailKey(email);
  if (!key) return undefined;
  return rows.find((row) => row.email === key && row.email !== currentEmail);
}
