/**
 * The daily target lives in localStorage, which React treats as an external
 * store. Reading it through useSyncExternalStore keeps the server snapshot
 * (the default) and the client snapshot in step without a setState-in-effect.
 */
const KEY = "reach.goal";
export const DEFAULT_GOAL = 30;

const listeners = new Set<() => void>();
let cached: number | null = null;

export function subscribeGoal(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGoal(): number {
  if (cached !== null) return cached;
  const raw = Number(window.localStorage.getItem(KEY));
  cached = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_GOAL;
  return cached;
}

export function getServerGoal(): number {
  return DEFAULT_GOAL;
}

export function writeGoal(n: number): void {
  cached = n;
  window.localStorage.setItem(KEY, String(n));
  for (const listener of listeners) listener();
}
