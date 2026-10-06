-- Aurex Desktop Agent tables
-- Run this once in Supabase SQL Editor.

create table if not exists desktop_devices (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists desktop_devices_user_id_idx
  on desktop_devices(user_id);

create table if not exists desktop_commands (
  id uuid primary key,
  device_id uuid not null references desktop_devices(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  command_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists desktop_commands_device_status_idx
  on desktop_commands(device_id, status, created_at);
