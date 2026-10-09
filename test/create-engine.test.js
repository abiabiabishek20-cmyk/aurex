const test = require("node:test");
const assert = require("node:assert/strict");
const { generateProjectBlueprint, safeProjectName } = require("../src/assistant/create");

test("website scaffold returns expected starter files without writing to disk", () => {
  const result = generateProjectBlueprint({
    type: "website",
    name: "My Photography Studio!",
    description: "A portfolio & booking site"
  });
  assert.equal(result.ok, true);
  assert.equal(result.type, "website");
  assert.equal(result.name, "my-photography-studio");
  assert.ok(result.files["index.html"]);
  assert.ok(result.files["styles.css"]);
  assert.ok(result.files["app.js"]);
  assert.match(result.files["index.html"], /A portfolio &amp; booking site/);
  assert.match(result.message, /No files were written to disk/i);
});

test("node API scaffold includes health route and excludes real credentials", () => {
  const result = generateProjectBlueprint({ type: "node-api", name: "Demo API", description: "Safe starter" });
  assert.equal(result.ok, true);
  assert.ok(result.files["src/server.js"].includes("/health"));
  assert.ok(result.files[".env.example"]);
  assert.ok(result.files[".gitignore"].includes(".env"));
  assert.ok(!Object.values(result.files).some(content => /sk-[A-Za-z0-9]{20,}/.test(content)));
});

test("unsupported project types and unsafe names are handled", () => {
  assert.equal(generateProjectBlueprint({ type: "shell" }).ok, false);
  assert.equal(safeProjectName("../../My App!"), "my-app");
  assert.equal(safeProjectName("!!!"), "aurex-project");
});
