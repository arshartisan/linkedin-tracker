import assert from "node:assert/strict";
import { test } from "node:test";
import { dayKey } from "./date";
import { linkedinConnects, teamActivity } from "./team";
import { hydrate, hydrateCompany } from "./types";
import { store } from "./store";
import { hasSupabase } from "./supabase";

test("client categories hydrate legacy and invalid rows without assigning a category", () => {
  assert.equal(hydrate({}).client_type, "unclassified");
  assert.equal(hydrate({ client_type: "enterprise" }).client_type, "enterprise");
  assert.equal(hydrate({ client_type: "potential" }).client_type, "potential");
  assert.equal(hydrate({ client_type: "invalid" } as never).client_type, "unclassified");
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
    storage.set("reach.connects.v1", JSON.stringify([{ id: "legacy", upwork_url: "https://www.upwork.com/jobs/~2" }]));
    assert.equal((await store.list())[0].client_type, "unclassified");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});
