const test = require("node:test");
const assert = require("node:assert/strict");
const { runResearch } = require("../src/assistant/research");

test("research service fails safely without an API key", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const result = await runResearch({ userId: "test-user", query: "latest AI news" });
  assert.equal(result.ok, false);
  assert.match(result.message, /not configured/i);
  if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
});
