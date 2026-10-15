import assert from "node:assert/strict";
import { test } from "node:test";
import { dayKey } from "./date";
import { activityCountsByDay, linkedinConnects, teamActivity, teamDateRange } from "./team";
import { EMPTY_STARTUP } from "./startup";
import { periodDelta } from "./stats";
import { hydrate, hydrateCompany, hasClientLabel, matchesClientType } from "./types";
import { store } from "./store";
import { hasSupabase } from "./supabase";

test("client categories hydrate legacy and invalid rows without assigning a category", () => {
  assert.equal(hydrate({}).client_type, "unclassified");
  assert.equal(hydrate({ client_type: "enterprise" }).client_type, "enterprise");
  assert.equal(hydrate({ client_type: "potential" }).client_type, "potential");
  assert.equal(hydrate({ client_type: "enterprise_potential" }).client_type, "enterprise_potential");
  assert.equal(hydrate({ client_type: "invalid" } as never).client_type, "unclassified");
});

test("overlapping labels appear under either filter and the combined filter", () => {
  assert.equal(hasClientLabel("enterprise_potential", "enterprise"), true);
  assert.equal(hasClientLabel("enterprise_potential", "potential"), true);
  for (const filter of ["all", "enterprise", "potential", "enterprise_potential"] as const) {
    assert.equal(matchesClientType("enterprise_potential", filter), true);
  }
  assert.equal(matchesClientType("enterprise_potential", "unclassified"), false);
  assert.equal(matchesClientType("enterprise", "potential"), false);
  assert.equal(matchesClientType("potential", "enterprise"), false);
  assert.equal(matchesClientType("unclassified", "enterprise"), false);
});

test("date presets use inclusive local calendar days across month and year boundaries", () => {
  const custom = { from: "2025-12-20", to: "2025-12-25" };
  assert.deepEqual(teamDateRange("today", "2026-01-01", custom), { from: "2026-01-01", to: "2026-01-01" });
  assert.deepEqual(teamDateRange("yesterday", "2026-01-01", custom), { from: "2025-12-31", to: "2025-12-31" });
  assert.deepEqual(teamDateRange("7", "2026-01-01", custom), { from: "2025-12-26", to: "2026-01-01" });
  assert.deepEqual(teamDateRange("14", "2026-10-15", custom), { from: "2026-10-02", to: "2026-10-15" });
  assert.deepEqual(teamDateRange("custom", "2026-01-01", custom), custom);
});

test("momentum includes every tracked record once with matching category, owner, and date totals", () => {
  const created = new Date(2026, 9, 15, 12).toISOString();
  const connects = [
    hydrate({ owner: "arsh", sent_on: "2026-10-15" }),
    hydrate({ owner: "abdul", sent_on: "2026-10-15", upwork_url: "https://upwork.com/jobs/~1", profile_url: "https://linkedin.com/in/client", outreach_channels: ["direct_email", "linkedin_message"] }),
    hydrate({ owner: "arsh", sent_on: "2026-10-14" }),
  ];
  const companies = [hydrateCompany({ owner: "arsh", created_at: created }), hydrateCompany({ owner: "rishad", created_at: "invalid" })];
  const startups = [{ ...EMPTY_STARTUP, id: "startup", owner: "rishad" as const, created_at: created }];
  const all = activityCountsByDay(connects, companies, startups, "all", "all");
  assert.equal(all.get("2026-10-15"), 4);
  assert.equal(all.get("2026-10-14"), 1);
  assert.equal(all.size, 2);
  assert.equal(activityCountsByDay(connects, companies, startups, "arsh", "all").get("2026-10-15"), 2);
  for (const kind of ["linkedin", "upwork", "companies", "startups"] as const) {
    assert.equal(activityCountsByDay(connects, companies, startups, "all", kind).get("2026-10-15"), 1);
  }
  assert.deepEqual(periodDelta(all, 1, "2026-10-15"), { current: 4, previous: 1, change: 3 });
  assert.deepEqual(periodDelta(all, 1, "2026-10-14"), { current: 1, previous: 0, change: null });
});

test("team totals separate researched profiles from invites, filter owners and dates, and count reached records once", () => {
  const connects = [
    hydrate({ id: "linkedin", owner: "arsh", sent_on: "2026-10-15", profile_url: "https://linkedin.com/in/a" }),
    hydrate({ id: "job", owner: "abdul", sent_on: "2026-10-15", upwork_url: "https://upwork.com/jobs/~1", profile_url: "https://linkedin.com/in/b", outreach_channels: ["direct_email", "linkedin_message"] }),
    hydrate({ id: "unreached", owner: "rishad", sent_on: "2026-10-15", upwork_url: "https://upwork.com/jobs/~2" }),
    hydrate({ id: "old", owner: "abdul", sent_on: "2026-09-01", upwork_url: "https://upwork.com/jobs/~3" }),
    hydrate({ id: "future", owner: "arsh", sent_on: "2026-10-16" }),
  ];
  const created = new Date(2026, 9, 15, 12).toISOString();
  const companies = [hydrateCompany({ owner: "abdul", created_at: created, outreach_channels: ["direct_email", "whatsapp"] }), hydrateCompany({ owner: "rishad", created_at: created })];
  assert.equal(dayKey(new Date(created)), "2026-10-15");
  assert.equal(linkedinConnects(connects).length, 2);
  const rows = teamActivity(connects, companies, "2026-10-02", "2026-10-15");
  assert.deepEqual(rows, [
    { id: "arsh", linkedin: 1, jobs: 0, jobsReached: 0, companies: 0, companiesReached: 0 },
    { id: "abdul", linkedin: 0, jobs: 1, jobsReached: 1, companies: 1, companiesReached: 1 },
    { id: "rishad", linkedin: 0, jobs: 1, jobsReached: 0, companies: 1, companiesReached: 0 },
  ]);
  assert.deepEqual(teamActivity(connects, companies, "2026-10-02", "2026-10-15", "abdul"), [rows[1]]);
  assert.equal(teamActivity([], [], "2026-10-02", "2026-10-15").length, 3);
});

test("local job categories persist on creation and editing and hydrate old records", { skip: hasSupabase }, async () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } } });
  try {
    const row = await store.add({ owner: "abdul", name: "Client", profile_url: "", upwork_url: "https://www.upwork.com/jobs/~1", client_type: "enterprise" });
    assert.equal((await store.list())[0].client_type, "enterprise");
    await store.update(row.id, { client_type: "potential" });
    assert.equal((await store.list())[0].client_type, "potential");
    await store.update(row.id, { client_type: "enterprise_potential" });
    assert.equal((await store.list())[0].client_type, "enterprise_potential");
    await store.update(row.id, { client_type: "enterprise" });
    assert.equal((await store.list())[0].client_type, "enterprise");
    await store.update(row.id, { client_type: "unclassified" });
    assert.equal((await store.list())[0].client_type, "unclassified");
    storage.set("reach.connects.v1", JSON.stringify([{ id: "legacy", upwork_url: "https://www.upwork.com/jobs/~2" }]));
    assert.equal((await store.list())[0].client_type, "unclassified");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});
