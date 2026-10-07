const crypto = require("crypto");
const { query } = require("./db");

async function ensureAuditTable() {
  await query(`
    create table if not exists aurex_audit_events (
      id uuid primary key,
      user_id text,
      device_id text,
      command_id text,
      event_type varchar(80) not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query("create index if not exists aurex_audit_events_user_created_idx on aurex_audit_events (user_id, created_at desc)");
  await query("create index if not exists aurex_audit_events_created_idx on aurex_audit_events (created_at desc)");
}

async function recordAudit({ userId = null, deviceId = null, commandId = null, eventType, metadata = {} }) {
  try {
    await query(
      `insert into aurex_audit_events
       (id, user_id, device_id, command_id, event_type, metadata)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        crypto.randomUUID(),
        userId ? String(userId) : null,
        deviceId ? String(deviceId) : null,
        commandId ? String(commandId) : null,
        String(eventType).slice(0, 80),
        JSON.stringify(metadata || {})
      ]
    );
  } catch (error) {
    console.error("Aurex audit write error:", error);
  }
}

module.exports = { ensureAuditTable, recordAudit };
