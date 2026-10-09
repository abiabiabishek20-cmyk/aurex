const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeTaskInput } = require("../src/assistant/tasks");

test("task input normalizes valid task fields", () => {
  const task = normalizeTaskInput({
    title: "  Finish Aurex Core  ",
    description: "Review tool flow",
    status: "in_progress",
    priority: "high",
    due_at: "2026-10-10T07:00:00+05:30"
  });
  assert.equal(task.title, "Finish Aurex Core");
  assert.equal(task.description, "Review tool flow");
  assert.equal(task.status, "in_progress");
  assert.equal(task.priority, "high");
  assert.ok(task.dueAt.endsWith("Z"));
});

test("task input rejects missing title and unsupported status", () => {
  assert.throws(() => normalizeTaskInput({ title: " " }), /title is required/i);
  assert.throws(() => normalizeTaskInput({ title: "Task", status: "run_shell" }), /invalid task status/i);
  assert.throws(() => normalizeTaskInput({ title: "Task", priority: "urgent-now" }), /invalid task priority/i);
});

test("task input rejects invalid due date and caps user text", () => {
  assert.throws(() => normalizeTaskInput({ title: "Task", due_at: "not-a-date" }), /invalid due_at/i);
  const task = normalizeTaskInput({ title: "T".repeat(300), description: "D".repeat(4000) });
  assert.equal(task.title.length, 180);
  assert.equal(task.description.length, 3000);
});
