const express = require("express");
const crypto = require("crypto");
const { query } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const desktopSockets = new Map();

function hashToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
function registerDesktopSocket(deviceId, ws) { desktopSockets.set(deviceId, ws); }
function removeDesktopSocket(deviceId, ws) { if (desktopSockets.get(deviceId) === ws) desktopSockets.delete(deviceId); }
function sendCommandToDevice(deviceId, command) {
  const ws = desktopSockets.get(deviceId);
  if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ type: "command", command })); return true; }
  return false;
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

router.post("/commands", async (req, res) => {
  try {
    const deviceId = String(req.body.deviceId || "");
    const commandType = String(req.body.type || "");
    const allowed = new Set(["ping", "get_system_info", "open_url", "capture_screenshot"]);
    if (!deviceId || !allowed.has(commandType)) return res.status(400).json({ error: "Invalid device or command type" });

    const device = await query("select id from desktop_devices where id = $1 and user_id = $2 limit 1", [deviceId, req.user.sub]);
    if (!device.rows[0]) return res.status(404).json({ error: "Desktop device not found" });

    const payload = req.body.payload || {};
    if (commandType === "open_url" && !/^https?:\/\//i.test(String(payload.url || ""))) return res.status(400).json({ error: "open_url requires an http(s) URL" });
    if (commandType === "capture_screenshot" && Object.keys(payload).length) return res.status(400).json({ error: "capture_screenshot does not accept a payload" });

    const id = crypto.randomUUID();
    await query(`insert into desktop_commands (id, device_id, user_id, command_type, payload) values ($1, $2, $3, $4, $5::jsonb)`, [id, deviceId, req.user.sub, commandType, JSON.stringify(payload)]);
    const delivered = sendCommandToDevice(deviceId, { id, command_type: commandType, payload });
    res.status(202).json({ command: { id, type: commandType, status: "queued", delivered } });
  } catch (error) { console.error(error); res.status(500).json({ error: "Could not queue desktop command" }); }
});

router.get("/commands/:id", async (req, res) => {
  try {
    const result = await query(`select id, device_id, command_type, payload, status, result, created_at, completed_at from desktop_commands where id = $1 and user_id = $2 limit 1`, [req.params.id, req.user.sub]);
    if (!result.rows[0]) return res.status(404).json({ error: "Command not found" });
    res.json({ command: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ error: "Could not read desktop command" }); }
});

module.exports = { router, hashToken, registerDesktopSocket, removeDesktopSocket };
