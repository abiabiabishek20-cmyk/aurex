function normalizeTaskInput(input = {}) {
  const title = String(input.title || "").trim().slice(0, 180);
  const description = String(input.description || "").trim().slice(0, 3000);
  const status = String(input.status || "pending");
  const priority = String(input.priority || "normal");
  if (!title) throw new Error("Task title is required.");
  if (!["pending", "in_progress", "completed", "cancelled"].includes(status)) throw new Error("Invalid task status.");
  if (!["low", "normal", "high"].includes(priority)) throw new Error("Invalid task priority.");
  let dueAt = null;
  if (input.due_at) {
    const parsed = new Date(input.due_at);
    if (Number.isNaN(parsed.getTime())) throw new Error("Invalid due_at date.");
    dueAt = parsed.toISOString();
  }
  return { title, description, status, priority, dueAt };
}

module.exports = { normalizeTaskInput };
