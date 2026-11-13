const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeShortcutText, offlineReadOnlyShortcut } = require("../src/assistant/shortcuts");

test("shortcut normalization collapses repeated whitespace and punctuation", () => {
  assert.equal(normalizeShortcutText("  En   PC online ah?  "), "en pc online ah");
});

test("Tanglish PC status and system info shortcuts are recognized", () => {
  assert.equal(offlineReadOnlyShortcut("En   PC online ah?"), "get_pc_status");
  assert.equal(offlineReadOnlyShortcut("en pc status enna"), "get_pc_status");
  assert.equal(offlineReadOnlyShortcut("PC   system info"), "get_system_info");
  assert.equal(offlineReadOnlyShortcut("Evlo RAM irukku?"), "get_system_info");
});

test("unknown messages do not trigger a desktop shortcut", () => {
  assert.equal(offlineReadOnlyShortcut("open my files"), null);
});
