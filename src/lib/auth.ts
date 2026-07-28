/**
 * Sign-in for the three people who share this tracker.
 *
 * The phone number *is* the credential — there is no SMS and no password. That
 * is a deliberate trade for a private team tool: it keeps the door shut without
 * an SMS provider, but it is a gate, not an identity system. Anyone who knows a
 * number can sign in as that person.
 *
 * This module is server-only. It is imported by proxy.ts, the route handlers
 * and the app layout — never from a "use client" file, or the numbers and the
 * signing secret would end up in the browser bundle.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserId } from "./types";

export type SessionUser = { id: UserId; name: string };

export const SESSION_COOKIE = "reach_session";
/** A year, as asked for: sign in once and stay signed in. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Keyed by the normalised number (see `normalisePhone`), so `0774338424`,
 * `774338424` and `+94 77 433 8424` all resolve to the same person.
 */
const USERS: Record<string, SessionUser> = {
  "774338424": { id: "arsh", name: "Arsh" },
  "718551424": { id: "abdul", name: "Abdul" },
  "770127060": { id: "rishad", name: "Rishad" },
};

/**
 * Sri Lankan numbers get typed three different ways. Reduce every form to the
 * nine subscriber digits before looking anyone up.
 */
export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("94")) return digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function findUser(phone: string): SessionUser | null {
  return USERS[normalisePhone(phone)] ?? null;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    // Refusing to sign is the right failure: a hard-coded fallback in
    // production would mean anyone could forge a session cookie.
    throw new Error("AUTH_SECRET is not set");
  }
  return "reach-dev-secret-not-for-production";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** `{"u":"arsh","exp":…}` base64url-encoded, with an HMAC over it. */
export function signSession(user: SessionUser): string {
  const payload = Buffer.from(
    JSON.stringify({ u: user.id, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns null for anything malformed, tampered with, or past its expiry. */
export function verifySession(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;

  const payload = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(payload), "base64url");
  // Lengths must match before timingSafeEqual, which throws otherwise.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      u?: string;
      exp?: number;
    };
    if (typeof exp !== "number" || exp * 1000 < Date.now()) return null;
    const user = Object.values(USERS).find((candidate) => candidate.id === u);
    return user ?? null;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
