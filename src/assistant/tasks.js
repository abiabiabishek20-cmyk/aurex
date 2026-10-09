const crypto = require("crypto");
const { query } = require("../db");

async function ensureTaskTable() {
  await query(`
    create table if not exists assistant_tasks (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      title text not null,
      description text not null default '',
      status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
      priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
      due_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      completed_at timestamptz
    )
  `);
  await query(`create index if not exists assistant_tasks_user_status_updated_idx on assistant_tasks(user_id, status, updated_at desc)`);
}

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

async function listTasks(userId, status = null) {
  const validStatus = status && ["pending", "in_progress", "completed", "cancelled"].includes(status) ? status : null;
  if (status && !validStatus) throw new Error("Invalid task status filter.");
  const result = await query(
    `select id, title, description, status, priority, due_at, created_at, updated_at, completed_at
     from assistant_tasks where user_id = $1 and ($2::text is null or status = $2)
     order by case priority when 'high' then 0 when 'normal' then 1 else 2 end, due_at asc nulls last, updated_at desc limit 200`,
    [userId, validStatus]
  );
  return result.rows;
}

async function createTask(userId, input) {
  const task = normalizeTaskInput(input);
  const id = crypto.randomUUID();
  const result = await query(
    `insert into assistant_tasks (id, user_id, title, description, status, priority, due_at, completed_at)
     values ($1, $2, $3, $4, $5, $6, $7, case when $5 = 'completed' then now() else null end)
     returning id, title, description, status, priority, due_at, created_at, updated_at, completed_at`,
    [id, userId, task.title, task.description, task.status, task.priority, task.dueAt]
  );
  return result.rows[0];
}

async function updateTask(userId, taskId, input) {
  const existing = await query("select status from assistant_tasks where id = $1 and user_id = $2 limit 1", [taskId, userId]);
  if (!existing.rows[0]) return null;
  const fields = [];
  const values = [taskId, userId];
  const allowed = {
    title: value => { const v = String(value || "").trim().slice(0, 180); if (!v) throw new Error("Task title is required."); return v; },
    description: value => String(value || "").trim().slice(0, 3000),
    status: value => { const v = String(value); if (!["pending", "in_progress", "completed", "cancelled"].includes(v)) throw new Error("Invalid task status."); return v; },
    priority: value => { const v = String(value); if (!["low", "normal", "high"].includes(v)) throw new Error("Invalid task priority."); return v; },
    due_at: value => { if (value === null || value === "") return null; const d = new Date(value); if (Number.isNaN(d.getTime())) throw new Error("Invalid due_at date."); return d.toISOString(); }
  };
  const columns = { title: "title", description: "description", status: "status", priority: "priority", due_at: "due_at" };
  for (const key of Object.keys(columns)) {
    if (!Object.prototype.hasOwnProperty.call(input || {}, key)) continue;
    values.push(allowed[key](input[key]));
    fields.push(columns[key] + " = $" + values.length);
  }
  if (!fields.length) throw new Error("No task fields to update.");
  const nextStatus = Object.prototype.hasOwnProperty.call(input || {}, "status") ? String(input.status) : existing.rows[0].status;
  if (!["pending", "in_progress", "completed", "cancelled"].includes(nextStatus)) throw new Error("Invalid task status.");
  values.push(nextStatus);
  fields.push("completed_at = case when $" + values.length + " = 'completed' then coalesce(completed_at, now()) else null end");
  fields.push("updated_at = now()");
  const result = await query(
    `update assistant_tasks set ${fields.join(", ")} where id = $1 and user_id = $2 returning id, title, description, status, priority, due_at, created_at, updated_at, completed_at`,
    values
  );
  return result.rows[0] || null;
}

async function deleteTask(userId, taskId) {
  const result = await query(
    "delete from assistant_tasks where id = $1 and user_id = $2 returning id",
    [taskId, userId]
  );
  return Boolean(result.rows[0]);
}

module.exports = { ensureTaskTable, listTasks, createTask, updateTask, deleteTask, normalizeTaskInput };
