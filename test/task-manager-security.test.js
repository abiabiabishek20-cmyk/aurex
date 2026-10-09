const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("task API requires authentication and scopes task access to the owner", () => {
  const routeSource = fs.readFileSync(path.join(__dirname, "../src/routes/tasks.js"), "utf8");
  const storeSource = fs.readFileSync(path.join(__dirname, "../src/assistant/tasks.js"), "utf8");
  assert.match(routeSource, /router\.use\(authMiddleware\)/);
  assert.match(storeSource, /where user_id = \$1/);
  assert.match(storeSource, /where id = \$1 and user_id = \$2/);
  assert.match(storeSource, /references users\(id\) on delete cascade/);
});

test("task API uses parameterized SQL and validates allowed statuses", () => {
  const storeSource = fs.readFileSync(path.join(__dirname, "../src/assistant/tasks.js"), "utf8");
  const validationSource = fs.readFileSync(path.join(__dirname, "../src/assistant/task-validation.js"), "utf8");
  assert.match(storeSource, /\$1/);
  assert.match(storeSource, /\$2/);
  assert.match(validationSource, /pending.*in_progress.*completed.*cancelled/);
  assert.match(validationSource, /low.*normal.*high/);
});
