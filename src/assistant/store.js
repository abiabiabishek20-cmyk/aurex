const crypto = require("crypto");
const { query } = require("../db");

async function ensureAssistantTables() {
  await query(`
    create table if not exists assistant_conversations (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      title text not null default 'Aurex Chat',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query(`
    create index if not exists assistant_conversations_user_updated_idx
    on assistant_conversations(user_id, updated_at desc)
  `);
  await query(`
    create table if not exists assistant_messages (
      id uuid primary key,
      conversation_id uuid not null references assistant_conversations(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      role text not null check (role in ('user', 'assistant')),
      content text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query(`
    create index if not exists assistant_messages_conversation_created_idx
    on assistant_messages(conversation_id, created_at asc)
  `);
  await query(`
    create table if not exists assistant_memories (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      content text not null,
      category text not null default 'general',
      source text not null default 'assistant',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query(`
    create index if not exists assistant_memories_user_updated_idx
    on assistant_memories(user_id, updated_at desc)
  `);
  await query(`
    create table if not exists assistant_pending_actions (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      conversation_id uuid not null references assistant_conversations(id) on delete cascade,
      tool_name text not null,
      arguments jsonb not null,
      status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )
  `);
  await query(`
    create index if not exists assistant_pending_actions_user_status_idx
    on assistant_pending_actions(user_id, status, created_at desc)
  `);
}
async function saveMemory(userId, content, category = "general") {
  const value = String(content || "").trim().slice(0, 2000);
  if (!value) throw new Error("Memory content is required.");
  const id = crypto.randomUUID();
  await query(
    "insert into assistant_memories (id, user_id, content, category) values ($1, $2, $3, $4)",
    [id, userId, value, String(category || "general").trim().slice(0, 80) || "general"]
  );
  return id;
}
async function searchMemories(userId, queryText, limit = 8) {
  const q = String(queryText || "").trim().slice(0, 500);
  if (!q) return [];
  const result = await query(
    "select id, content, category, created_at, updated_at from assistant_memories where user_id = $1 and content ilike $2 order by updated_at desc limit $3",
    [userId, "%" + q + "%", Math.min(Math.max(Number(limit) || 8, 1), 20)]
  );
  return result.rows;
}
async function createConversation(userId, title = "Aurex Chat") {
  const id = crypto.randomUUID();
  await query("insert into assistant_conversations (id, user_id, title) values ($1, $2, $3)", [id, userId, String(title).slice(0, 120)]);
  return id;
}
async function getConversation(userId, conversationId) {
  const result = await query("select id, user_id, title, created_at, updated_at from assistant_conversations where id = $1 and user_id = $2 limit 1", [conversationId, userId]);
  return result.rows[0] || null;
}
async function getOrCreateConversation(userId, conversationId) {
  if (conversationId) {
    const existing = await getConversation(userId, conversationId);
    if (existing) return existing.id;
  }
  return createConversation(userId);
}
async function loadMessages(userId, conversationId, limit = 30) {
  const result = await query(`select role, content from assistant_messages where user_id = $1 and conversation_id = $2 order by created_at desc limit $3`, [userId, conversationId, limit]);
  return result.rows.reverse();
}
async function addMessage(userId, conversationId, role, content, metadata = {}) {
  await query(`insert into assistant_messages (id, conversation_id, user_id, role, content, metadata) values ($1, $2, $3, $4, $5, $6::jsonb)`, [crypto.randomUUID(), conversationId, userId, role, String(content).slice(0, 20000), JSON.stringify(metadata)]);
  await query("update assistant_conversations set updated_at = now() where id = $1 and user_id = $2", [conversationId, userId]);
}
async function createPendingAction(userId, conversationId, toolName, args, ttlSeconds = 300) {
  const id = crypto.randomUUID();
  await query(`insert into assistant_pending_actions (id, user_id, conversation_id, tool_name, arguments, expires_at) values ($1, $2, $3, $4, $5::jsonb, now() + ($6 * interval '1 second'))`, [id, userId, conversationId, toolName, JSON.stringify(args), ttlSeconds]);
  return id;
}
async function consumePendingAction(userId, actionId) {
  const result = await query(`update assistant_pending_actions set status = 'confirmed' where id = $1 and user_id = $2 and status = 'pending' and expires_at > now() returning id, conversation_id, tool_name, arguments`, [actionId, userId]);
  return result.rows[0] || null;
}
module.exports = { ensureAssistantTables, saveMemory, searchMemories, createConversation, getConversation, getOrCreateConversation, loadMessages, addMessage, createPendingAction, consumePendingAction };
