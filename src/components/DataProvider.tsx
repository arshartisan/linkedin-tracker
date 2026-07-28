"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { store, storeMode, type ConnectPatch } from "@/lib/store";
import {
  DEFAULT_GOAL,
  USER_IDS,
  USER_LABEL,
  type Connect,
  type NewConnect,
  type Stage,
  type User,
  type UserId,
} from "@/lib/types";
import { profileSlug } from "@/lib/linkedin";
import {
  buildQueue,
  completionPatch,
  stagePatch,
  type Action,
  type Queue,
} from "@/lib/pipeline";
import { dayKey } from "@/lib/date";

export type Me = { id: UserId; name: string };

type Ctx = {
  /** Whoever is signed in. Set from the session cookie by (app)/layout.tsx. */
  me: Me;
  /**
   * Every connect the team has logged. Only the Team screen and the duplicate
   * check read this - the personal screens read `mine`.
   */
  connects: Connect[];
  /** The signed-in person's connects. This is what Today/History/Queue/Leads show. */
  mine: Connect[];
  loading: boolean;
  error: string | null;
  /** The signed-in person's daily target. */
  goal: number;
  /** Every target, so the Team view can sum them. */
  goals: Record<UserId, number>;
  users: User[];
  setGoal: (n: number) => Promise<void>;
  add: (input: Omit<NewConnect, "owner">) => Promise<Connect>;
  update: (id: string, patch: ConnectPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Move someone along the pipeline, stamping the milestone day. */
  setStage: (connect: Connect, stage: Stage) => Promise<void>;
  /** Finish the queued action for someone in one click. */
  complete: (connect: Connect, action: Action) => Promise<void>;
  /** Every pipeline bucket for the signed-in person, derived once per change. */
  queue: Queue;
  /**
   * Earlier connect to the same profile, by *anyone*. Team-wide on purpose:
   * the whole point of sharing the tracker is not approaching someone twice.
   */
  findDuplicate: (url: string) => Connect | null;
  mode: typeof storeMode;
};

const DataContext = createContext<Ctx | null>(null);

const FALLBACK_USERS: User[] = USER_IDS.map((id) => ({
  id,
  name: USER_LABEL[id],
  daily_goal: DEFAULT_GOAL,
}));

export function DataProvider({
  me,
  children,
}: {
  me: Me;
  children: React.ReactNode;
}) {
  const [connects, setConnects] = useState<Connect[]>([]);
  const [users, setUsers] = useState<User[]>(FALLBACK_USERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rollback needs the list as it was before an optimistic edit. Reading it
  // from a ref (rather than a dependency) keeps `update`/`remove` stable, so
  // the context value doesn't churn on every keystroke.
  const latest = useRef<Connect[]>(connects);
  useEffect(() => {
    latest.current = connects;
  }, [connects]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([store.list(), store.listUsers()])
      .then(([rows, roster]) => {
        if (cancelled) return;
        setConnects(rows);
        setUsers(roster);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setGoal = useCallback(
    async (n: number) => {
      // Optimistic, like the stage chips: the number should move on the click.
      const previous = users;
      setUsers((prev) =>
        prev.map((u) => (u.id === me.id ? { ...u, daily_goal: n } : u))
      );
      try {
        await store.setGoal(me.id, n);
      } catch (e) {
        // Nothing downstream can act on this, so roll back and surface it
        // through `error` rather than rejecting into a fire-and-forget caller.
        setUsers(previous);
        setError((e as Error).message);
      }
    },
    [me.id, users]
  );

  const add = useCallback(
    async (input: Omit<NewConnect, "owner">) => {
      const row = await store.add({ ...input, owner: me.id });
      setConnects((prev) => [row, ...prev]);
      return row;
    },
    [me.id]
  );

  const update = useCallback(async (id: string, patch: ConnectPatch) => {
    // Optimistic: stage chips should respond on the click, not on the round trip.
    const previous = latest.current.find((r) => r.id === id);
    setConnects((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
    try {
      await store.update(id, patch);
    } catch (e) {
      if (previous) setConnects((prev) => prev.map((r) => (r.id === id ? previous : r)));
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const snapshot = latest.current;
    setConnects((prev) => prev.filter((r) => r.id !== id));
    try {
      await store.remove(id);
    } catch (e) {
      setConnects(snapshot);
      setError((e as Error).message);
      throw e;
    }
  }, []);

  const setStage = useCallback(
    (connect: Connect, stage: Stage) =>
      update(connect.id, stagePatch(stage, connect)),
    [update]
  );

  const complete = useCallback(
    (connect: Connect, action: Action) =>
      update(connect.id, completionPatch(action, connect)),
    [update]
  );

  const mine = useMemo(
    () => connects.filter((c) => c.owner === me.id),
    [connects, me.id]
  );

  const today = dayKey();
  // Built from `mine`: nobody should see a teammate's follow-ups in their queue.
  const queue = useMemo(() => buildQueue(mine, today), [mine, today]);

  const goals = useMemo(
    () =>
      Object.fromEntries(users.map((u) => [u.id, u.daily_goal])) as Record<
        UserId,
        number
      >,
    [users]
  );
  const goal = goals[me.id] ?? DEFAULT_GOAL;

  const bySlug = useMemo(() => {
    const map = new Map<string, Connect>();
    // connects is newest-first, so walking backwards leaves the earliest hit.
    for (let i = connects.length - 1; i >= 0; i--) {
      const slug = profileSlug(connects[i].profile_url);
      if (slug) map.set(slug, connects[i]);
    }
    return map;
  }, [connects]);

  const findDuplicate = useCallback(
    (url: string) => {
      const slug = profileSlug(url);
      return slug ? bySlug.get(slug) ?? null : null;
    },
    [bySlug]
  );

  const value = useMemo<Ctx>(
    () => ({
      me,
      connects,
      mine,
      loading,
      error,
      goal,
      goals,
      users,
      setGoal,
      add,
      update,
      remove,
      setStage,
      complete,
      queue,
      findDuplicate,
      mode: storeMode,
    }),
    [
      me,
      connects,
      mine,
      loading,
      error,
      goal,
      goals,
      users,
      setGoal,
      add,
      update,
      remove,
      setStage,
      complete,
      queue,
      findDuplicate,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
