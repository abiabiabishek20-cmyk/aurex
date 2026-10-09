const test = require("node:test");
const assert = require("node:assert/strict");
const { createPlan } = require("../src/assistant/planner");

test("create_plan returns an ordered plan for app creation", async () => {
  const result = await createPlan({ request: "Create a website for my photography studio", goal: "Working studio website" });

  assert.equal(result.ok, true);
  assert.equal(result.planning_only, true);
  assert.equal(result.goal, "Working studio website");
  assert.deepEqual(result.phases.map(phase => phase.title), [
    "Understand", "Design", "Build", "Verify", "Deliver"
  ]);
  assert.match(result.phases[4].actions.join(" "), /explicit confirmation/i);
});

test("create_plan returns a general plan for a non-build task", async () => {
  const result = await createPlan({ request: "Organize my tasks for tomorrow" });

  assert.equal(result.ok, true);
  assert.equal(result.planning_only, true);
  assert.deepEqual(result.phases.map(phase => phase.title), [
    "Understand", "Plan", "Execute", "Verify"
  ]);
});

test("create_plan rejects an empty request and does not execute side effects", async () => {
  const result = await createPlan({ request: "   " });

  assert.equal(result.ok, false);
  assert.match(result.message, /planning request is required/i);
  assert.equal("command" in result, false);
  assert.equal("deployment" in result, false);
});
