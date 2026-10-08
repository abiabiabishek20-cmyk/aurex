const test = require("node:test");
const assert = require("node:assert/strict");

const { AUREX_PERSONA, personaInstructions } = require("../src/assistant/persona");
const { getModules } = require("../src/assistant/modules");

test("Aurex persona has the master identity", () => {
  assert.equal(AUREX_PERSONA.name, "AUREX");
  assert.equal(AUREX_PERSONA.role, "Private Personal AI Assistant");
  assert.ok(AUREX_PERSONA.languages.includes("Tamil"));
  assert.ok(AUREX_PERSONA.languages.includes("Tanglish"));
  assert.match(personaInstructions(), /private personal AI assistant/i);
});

test("Aurex module registry exposes the planned architecture", () => {
  const ids = getModules().map(module => module.id);
  for (const id of ["core", "memory", "research", "create", "manager", "voice"]) {
    assert.ok(ids.includes(id), id + " module is missing");
  }
});
