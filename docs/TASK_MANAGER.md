# Aurex Task Manager

The task manager is a private, authenticated feature of Aurex. It stores tasks under the authenticated user's account and never executes external actions merely because a task is created.

## API

All routes require the normal Aurex Bearer JWT.

- `GET /api/tasks` — list up to 200 tasks, ordered by priority and due date.
- `GET /api/tasks?status=pending` — filter by `pending`, `in_progress`, `completed`, or `cancelled`.
- `POST /api/tasks` — create a task with `title`; optional `description`, `priority`, `status`, and ISO-8601 `due_at`.
- `PATCH /api/tasks/:id` — update only supplied fields.
- `DELETE /api/tasks/:id` — delete a task belonging to the authenticated user.

Priority values are `low`, `normal`, and `high`. Task titles are limited to 180 characters and descriptions to 3,000 characters.

## Assistant tools

- `create_task` saves a task in the private task list.
- `list_tasks` lists tasks, optionally by status.
- `update_task_status` changes a task's status.

These tools manage records in Aurex only. They do not launch programs, run shell commands, send messages, publish content, or deploy software.

## Data isolation

Every read, update, and delete is constrained by both task ID and the authenticated user's ID. The task table references the users table with cascade deletion. Inputs are validated and SQL values are parameterized.

## Limitations

The manager currently supports persistent task tracking and planning. It does not yet autonomously execute arbitrary multi-step projects, create files on the user's PC, or deploy generated applications. Those capabilities require separately implemented, tested, and permission-gated workflows.
