/**
 * Asks the Windows machine directly how it is, through its Tailscale Funnel
 * address. Server-side so the token never reaches the browser; the proxy only
 * lets signed-in people call it.
 */
import type { EngineHealth } from "@/lib/engine";

export async function GET() {
  const url = process.env.ENGINE_HEALTH_URL?.replace(/\/$/, "");
  const token = process.env.ENGINE_HEALTH_TOKEN;
  if (!url || !token) {
    return Response.json(
      { reachable: false, ms: 0, reason: "Not set up: add ENGINE_HEALTH_URL and ENGINE_HEALTH_TOKEN in Vercel." } satisfies EngineHealth,
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const started = Date.now();
  let body: EngineHealth;
  try {
    const res = await fetch(`${url}/health`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const ms = Date.now() - started;
    if (res.ok) {
      body = { reachable: true, ms, report: await res.json() };
    } else if (res.status === 401) {
      body = { reachable: false, ms, reason: "The machine answered but rejected the token: HEALTH_TOKEN and ENGINE_HEALTH_TOKEN don't match." };
    } else if (res.status === 502 || res.status === 503 || res.status === 504) {
      body = { reachable: false, ms, reason: `Machine is on (Tailscale answered, ${res.status}) but the worker isn't running. Start start-engine.bat or log in to Windows.` };
    } else {
      body = { reachable: false, ms, reason: `Unexpected answer: HTTP ${res.status}.` };
    }
  } catch (e) {
    const ms = Date.now() - started;
    const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    body = {
      reachable: false,
      ms,
      reason: timeout
        ? "No answer in 10 s: the machine is off, asleep or offline, or Tailscale isn't running."
        : `Couldn't reach the machine: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
