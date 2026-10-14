import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_STARTUP, findStartupDuplicate, httpUrl, normalizeStartup, startupLinkedinKey, type Startup } from "./startup";
import { startupStore } from "./startup-store";
import { hasSupabase } from "./supabase";

const existing: Startup = {
  ...EMPTY_STARTUP, id: "one", owner: "abdul", created_at: "2026-10-14T00:00:00Z",
  name: "Acme Labs", website_url: "https://acme.com", linkedin_url: "https://www.linkedin.com/company/acme",
  founder_linkedin_urls: ["https://www.linkedin.com/in/jane", "https://www.linkedin.com/in/john"],
};

test("startup names stay unique with different websites, owners, casing, and whitespace", () => {
  assert.equal(findStartupDuplicate([existing], { ...EMPTY_STARTUP, name: "  ACME   Labs ", website_url: "https://different.com" })?.id, "one");
  assert.equal(findStartupDuplicate([existing], { ...EMPTY_STARTUP, name: "Another startup" }), undefined);
});

test("any overlapping founder or startup LinkedIn link is a team duplicate", () => {
  for (const url of ["http://linkedin.com/in/JANE/?trk=abc", "https://uk.linkedin.com/in/john/details/experience/", "linkedin.com/company/ACME/people"]) {
    assert.equal(findStartupDuplicate([existing], { ...EMPTY_STARTUP, name: "New name", founder_linkedin_urls: ["https://linkedin.com/in/other", url] })?.owner, "abdul");
  }
  assert.equal(startupLinkedinKey("https://notlinkedin.com/in/jane"), "");
  assert.equal(startupLinkedinKey("https://linkedin.com.evil.com/in/jane"), "");
});

test("edits exclude their own identity but still reject another startup's profile", () => {
  assert.equal(findStartupDuplicate([existing], existing, "one"), undefined);
  const other = { ...existing, id: "two", name: "Other", linkedin_url: "", founder_linkedin_urls: ["https://linkedin.com/in/other"] };
  assert.equal(findStartupDuplicate([existing, other], { ...existing, founder_linkedin_urls: other.founder_linkedin_urls }, "one")?.id, "two");
});

test("normalize optional links and prevent malformed or repeated founders", () => {
  const result = normalizeStartup({ ...EMPTY_STARTUP, name: " Acme   Labs ", website_url: "acme.com", founder_linkedin_urls: ["linkedin.com/in/JANE?trk=abc", ""], outreach_channels: ["email", "email", "instagram"] });
  assert.equal(result.name, "Acme Labs");
  assert.equal(result.website_url, "https://acme.com/");
  assert.deepEqual(result.founder_linkedin_urls, ["https://www.linkedin.com/in/jane"]);
  assert.deepEqual(result.outreach_channels, ["email", "instagram"]);
  assert.throws(() => normalizeStartup({ ...EMPTY_STARTUP, name: "" }), /startup name/);
  assert.throws(() => normalizeStartup({ ...EMPTY_STARTUP, name: "Acme", founder_linkedin_urls: ["https://linkedin.com/company/acme"] }), /founder/);
  assert.throws(() => normalizeStartup({ ...EMPTY_STARTUP, name: "Acme", founder_linkedin_urls: ["linkedin.com/in/jane", "linkedin.com/in/JANE/"] }), /only once/);
  assert.throws(() => normalizeStartup({ ...EMPTY_STARTUP, name: "Acme", email: "broken" }), /email/);
  assert.throws(() => httpUrl("javascript:alert(1)"), /http or https/);
  assert.throws(() => httpUrl("https://user:password@example.com"), /http or https/);
});

test("edit payloads omit stored and generated metadata", () => {
  const result = normalizeStartup({ ...existing, name_key: "acme labs" } as Startup);
  assert.equal("id" in result, false);
  assert.equal("owner" in result, false);
  assert.equal("created_at" in result, false);
  assert.equal("name_key" in result, false);
});

test("local saves reject team duplicates and conflicting edits, including simultaneous adds", { skip: hasSupabase }, async () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } } });
  try {
    const first = await startupStore.save({ ...EMPTY_STARTUP, name: "First", founder_linkedin_urls: ["linkedin.com/in/first"] }, "arsh");
    await assert.rejects(() => startupStore.save({ ...EMPTY_STARTUP, name: " FIRST " }, "abdul"), /already tracked/);
    const second = await startupStore.save({ ...EMPTY_STARTUP, name: "Second", founder_linkedin_urls: ["linkedin.com/in/second"] }, "abdul");
    await assert.rejects(() => startupStore.save({ ...second, founder_linkedin_urls: first.founder_linkedin_urls }, "abdul", second.id), /already tracked/);
    assert.deepEqual((await startupStore.list()).find((row) => row.id === second.id)?.founder_linkedin_urls, second.founder_linkedin_urls);
    const attempts = await Promise.allSettled([
      startupStore.save({ ...EMPTY_STARTUP, name: "Concurrent A", founder_linkedin_urls: ["linkedin.com/in/concurrent"] }, "arsh"),
      startupStore.save({ ...EMPTY_STARTUP, name: "Concurrent B", founder_linkedin_urls: ["linkedin.com/in/CONCURRENT?trk=1"] }, "abdul"),
    ]);
    assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 1);
    await startupStore.remove(first.id);
    await startupStore.save({ ...EMPTY_STARTUP, name: "First", founder_linkedin_urls: ["linkedin.com/in/first"] }, "rishad");
  } finally { Reflect.deleteProperty(globalThis, "window"); }
});
