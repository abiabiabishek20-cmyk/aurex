const test = require("node:test");
const assert = require("node:assert/strict");

test("assistant store schema keeps user ownership and confirmation state", () => {
  const source = require("fs").readFileSync(require("path").join(__dirname, "../src/assistant/store.js"), "utf8");
  assert.match(source, /references users\(id\) on delete cascade/);
  assert.match(source, /status text not null default 'pending'/);
  assert.match(source, /expires_at timestamptz not null/);
  assert.match(source, /where id = \$1 and user_id = \$2/);
});
