import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_SOP, normalizeSop, SOP_CONFLICT_MESSAGE, sopHasContent, sopPlainText } from "./sop";
import { sopStore } from "./sop-store";
import { hasSupabase } from "./supabase";

test("plain text drops markup, decodes entities, and separates blocks", () => {
  assert.equal(sopPlainText("<h1>Daily</h1><p>Send <strong>10</strong> invites &amp; log them</p><ul><li><p>One</p></li><li><p>Two</p></li></ul>"),
    "Daily Send 10 invites & log them One Two");
  assert.equal(sopPlainText("<p>a&nbsp;&lt;b&gt;</p>"), "a <b>");
});

test("a cleared editor counts as empty content", () => {
  assert.equal(sopHasContent("<p></p>"), false);
  assert.equal(sopHasContent(""), false);
  assert.equal(sopHasContent("<p> x </p>"), true);
  assert.equal(normalizeSop({ ...EMPTY_SOP, title: "T", content: "<p></p>" }).content, "");
});

test("titles are trimmed and required, categories must be known", () => {
  assert.equal(normalizeSop({ ...EMPTY_SOP, title: "  Weekly   review " }).title, "Weekly review");
  assert.throws(() => normalizeSop({ ...EMPTY_SOP, title: "   " }), /title/);
  assert.throws(() => normalizeSop({ ...EMPTY_SOP, title: "x".repeat(161) }), /160/);
  assert.throws(() => normalizeSop({ ...EMPTY_SOP, title: "T", category: "nope" as never }), /category/);
});

test("local saves keep the creator, record the editor, and refuse stale edits", { skip: hasSupabase }, async () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  } } });
  try {
    const created = await sopStore.save({ ...EMPTY_SOP, title: "Outreach", content: "<p>v1</p>" }, "abdul");
    assert.equal(created.owner, "abdul");
    await new Promise((resolve) => setTimeout(resolve, 2));
    const edited = await sopStore.save({ ...EMPTY_SOP, title: "Outreach", content: "<p>v2</p>" }, "rishad", created);
    assert.equal(edited.owner, "abdul");
    assert.equal(edited.updated_by, "rishad");
    assert.equal(edited.created_at, created.created_at);
    // A second editor still holding the original version must not overwrite v2.
    await assert.rejects(sopStore.save({ ...EMPTY_SOP, title: "Outreach", content: "<p>other</p>" }, "arsh", created), { message: SOP_CONFLICT_MESSAGE });
    assert.equal((await sopStore.list())[0].content, "<p>v2</p>");
    await sopStore.remove(created.id);
    assert.deepEqual(await sopStore.list(), []);
  } finally { Reflect.deleteProperty(globalThis, "window"); }
});
