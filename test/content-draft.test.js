const test = require("node:test");
const assert = require("node:assert/strict");
const { createContentDraft } = require("../src/assistant/content");

test("content draft is structured and never publishes", () => {
  const result = createContentDraft({
    platform: "instagram",
    topic: "Studio launch",
    language: "Tamil",
    tone: "cinematic",
    caption: "A new chapter begins.",
    hashtags: ["#TheniClicks", "#Photography", "#TheniClicks"],
    call_to_action: "Book your session"
  });
  assert.equal(result.ok, true);
  assert.equal(result.published, false);
  assert.deepEqual(result.draft.hashtags, ["TheniClicks", "Photography"]);
});

test("content draft rejects missing copy and unsupported platforms", () => {
  assert.equal(createContentDraft({ topic: "Launch" }).ok, false);
  assert.equal(createContentDraft({ platform: "unknown", topic: "Launch", caption: "Hello" }).ok, false);
});
