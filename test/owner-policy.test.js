const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateOwnerRegistration } = require("../src/auth/owner-policy");

test("owner registration fails closed when the owner email is not configured", () => {
  const result = evaluateOwnerRegistration("owner@example.com", "");
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.equal(result.code, "owner_not_configured");
});

test("only the configured owner email can register", () => {
  assert.equal(evaluateOwnerRegistration("owner@example.com", "OWNER@example.com").ok, true);
  const denied = evaluateOwnerRegistration("other@example.com", "owner@example.com");
  assert.equal(denied.ok, false);
  assert.equal(denied.status, 403);
  assert.equal(denied.code, "not_configured_owner");
});
