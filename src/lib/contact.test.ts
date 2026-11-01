import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_CONTACT, findContactDuplicate, normalizeContact, normalizePhone, type Contact } from "./contact";

const existing: Contact = { ...EMPTY_CONTACT, name: "Jane", email: "jane@acme.com", owner: "abdul", created_at: "2026-11-01T00:00:00Z" };

test("emails are the identity, ignoring case and whitespace", () => {
  assert.equal(findContactDuplicate([existing], "  JANE@Acme.com ")?.owner, "abdul");
  assert.equal(findContactDuplicate([existing], "john@acme.com"), undefined);
  assert.equal(findContactDuplicate([existing], "jane@acme.com", "jane@acme.com"), undefined);
  assert.equal(findContactDuplicate([existing, { ...existing, email: "other@acme.com" }], "jane@acme.com", "other@acme.com")?.email, "jane@acme.com");
});

test("normalize requires name and email, keeps the rest optional", () => {
  const result = normalizeContact({ name: "  Jane   Doe ", email: " Jane@Acme.COM ", phone: " +1 (555) 123-4567 ", country: " United  States ", social_url: "linkedin.com/in/jane" });
  assert.deepEqual(result, { name: "Jane Doe", email: "jane@acme.com", phone: "+1 (555) 123-4567", country: "United States", social_url: "https://linkedin.com/in/jane" });
  assert.deepEqual(normalizeContact({ ...EMPTY_CONTACT, name: "A", email: "a@b.co" }), { ...EMPTY_CONTACT, name: "A", email: "a@b.co" });
  assert.throws(() => normalizeContact({ ...EMPTY_CONTACT, email: "a@b.co" }), /name/);
  assert.throws(() => normalizeContact({ ...EMPTY_CONTACT, name: "A" }), /email/);
  assert.throws(() => normalizeContact({ ...EMPTY_CONTACT, name: "A", email: "broken" }), /valid email/);
  assert.throws(() => normalizeContact({ ...EMPTY_CONTACT, name: "A", email: "a@b.co", social_url: "javascript:alert(1)" }), /http or https/);
});

test("phone numbers allow common formatting but need 7 to 15 digits", () => {
  assert.equal(normalizePhone(""), "");
  assert.equal(normalizePhone("+971 50 123 4567"), "+971 50 123 4567");
  assert.throws(() => normalizePhone("12345"), /7 and 15/);
  assert.throws(() => normalizePhone("call me"), /digits/);
});
