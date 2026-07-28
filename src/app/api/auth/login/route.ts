import { NextResponse } from "next/server";
import { cookieOptions, findUser, SESSION_COOKIE, signSession } from "@/lib/auth";

/*
  Three valid numbers is a small keyspace, so slow down anyone walking it. This
  lives in module memory: it resets on redeploy and isn't shared across serverless
  instances, which is fine — it's friction for a private tool, not a rate limiter.
*/
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; until: number }>();

function tooMany(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.until < now) {
    attempts.set(key, { count: 1, until: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooMany(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute and try again." },
      { status: 429 }
    );
  }

  let phone = "";
  try {
    const body = (await request.json()) as { phone?: unknown };
    if (typeof body.phone === "string") phone = body.phone;
  } catch {
    phone = "";
  }

  const user = findUser(phone);
  if (!user) {
    // Deliberately vague: don't confirm which numbers exist.
    return NextResponse.json({ error: "That number isn't on the team." }, { status: 401 });
  }

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, signSession(user), cookieOptions);
  return response;
}
