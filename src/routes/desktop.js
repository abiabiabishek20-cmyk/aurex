const express = require("express");
const crypto = require("crypto");
const { query } = require("../db");
const { authMiddleware } = require("../middleware/auth");
const { validateCommand } = require("../desktop/commands");

const router = express.Router();
const desktopSockets = new Map();

function hashToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
function registerDesktopSocket(deviceId, ws) { desktopSockets.set(deviceId, ws); }
function removeDesktopSocket(deviceId, ws) { if (desktopSockets.get(deviceId) === ws) desktopSockets.delete(deviceId); }

async function requeueStaleCommands(deviceId) {
  await query(
    "update desktop_commands set status = 'queued' where device_id = $1 and status = 'dispatched' and created_at < now() - interval '60 seconds'",
    [deviceId]
  );
}

async function dispatchNextQueuedCommand(deviceId) {
  const ws = desktopSockets.get(deviceId);
  if (!ws || ws.readyState !== 1) return false;

  const queued = await query(
    "select id from desktop_commands where device_id = $1 and status = 'queued' order by created_at asc limit 1",
    [deviceId]
  );
  if (!queued.rows[0]) return false;

  const claimed = await query(
    "update desktop_commands set status = 'dispatched' where id = $1 and device_id = $2 and status = 'queued' returning id, command_type, payload",
    [queued.rows[0].id, deviceId]
  );
  if (!claimed.rows[0] || ws.readyState !== 1) return false;

  ws.send(JSON.stringify({ type: "command", command: claimed.rows[0] }));
  return true;
}

router.use(authMiddleware);

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "My Windows PC").trim().slice(0, 100);
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("hex");
    await query(`insert into desktop_devices (id, user_id, name, token_hash) values ($1, $2, $3, $4)`, [id, req.user.sub, name || "My Windows PC", hashToken(token)]);
    res.status(201).json({ device: { id, name: name || "My Windows PC" }, token });
  } catch (error) { console.error(error); res.status(500).json({ error: "Could not register desktop agent" }); }
});

router.get("/devices", async (req, res) => {
  try {
    const result = await query(`select id, name, last_seen_at, created_at from desktop_devices where user_id = $1 order by created_at desc`, [req.user.sub]);
    res.json({ devices: result.rows.map(device => ({ ...device, online: desktopSockets.has(device.id) })) });
  } catch (error) { console.error(error); res.status(500).json({ error: "Could not list desktop devices" }); }
});

router.get("/status", async (req, res) => {
  try {
    const deviceResult = await query(
      `select id, name, last_seen_at, created_at
       from desktop_devices
       where user_id = $1
       order by created_at desc
       limit 1`,
      [req.user.sub]
    );
    const device = deviceResult.rows[0] || null;
    const counts = await query(
      `select status, count(*)::int as count
       from desktop_commands
       where user_id = $1
       group by status`,
      [req.user.sub]
    );
    const summary = { queued: 0, dispatched: 0, completed: 0, failed: 0 };
    for (const row of counts.rows) summary[row.status] = row.count;
    res.json({
      device: device ? { ...device, online: desktopSockets.has(device.id) } : null,
      commands: summary,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not read desktop status" });
  }
});

router.get("/commands", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || "20", 10) || 20, 1), 50);
    const result = await query(
      `select id, device_id, command_type, status, result, created_at, completed_at
       from desktop_commands
       where user_id = $1
       order by created_at desc
       limit $2`,
      [req.user.sub, limit]
    );
    res.json({ commands: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ error: "Could not read desktop command audit" }); }
});

router.post("/commands", async (req, res) => {
  try {
    const deviceId = String(req.body.deviceId || "");
    const commandType = String(req.body.type || "");
    if (!deviceId) return res.status(400).json({ error: "Invalid device or command type" });

    const validation = validateCommand(commandType, req.body.payload || {});
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const device = await query("select id from desktop_devices where id = $1 and user_id = $2 limit 1", [deviceId, req.user.sub]);
    if (!device.rows[0]) return res.status(404).json({ error: "Desktop device not found" });

    const payload = validation.payload;
    const id = crypto.randomUUID();
    await query(`insert into desktop_commands (id, device_id, user_id, command_type, payload) values ($1, $2, $3, $4, $5::jsonb)`, [id, deviceId, req.user.sub, commandType, JSON.stringify(payload)]);

    await requeueStaleCommands(deviceId);
    const delivered = await dispatchNextQueuedCommand(deviceId);
    res.status(202).json({ command: { id, type: commandType, status: delivered ? "dispatched" : "queued", delivered } });
  } catch (error) { console.error(error); res.status(500).json({ error: "Could not queue desktop command" }); }
});

router.get("/commands/:id", async (req, res) => {
  try {
    const result = await query(`select id, device_id, command_type, payload, status, result, created_at, completed_at from desktop_commands where id = $1 and user_id = $2 limit 1`, [req.params.id, req.user.sub]);
    if (!result.rows[0]) return res.status(404).json({ error: "Command not found" });
    res.json({ command: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ error: "Could not read desktop command" }); }
});

module.exports = { router, hashToken, registerDesktopSocket, removeDesktopSocket, requeueStaleCommands, dispatchNextQueuedCommand };
