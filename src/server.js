require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const authRoutes = require("./routes/auth");
const {
  router: desktopRoutes,
  hashToken,
  registerDesktopSocket,
  removeDesktopSocket,
  requeueStaleCommands,
  dispatchNextQueuedCommand,
  touchDesktopHeartbeat
} = require("./routes/desktop");
const { authMiddleware } = require("./middleware/auth");
const { query } = require("./db");
const { ensureAuditTable, recordAudit } = require("./audit");

const app = express();
const PORT = process.env.PORT || 3000;
const desktopSockets = new Map();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "../web")));

app.get("/api/health", async (_req, res) => {
  try { await query("select 1"); res.json({ ok: true, service: "aurex-api", database: "connected", uptime_seconds: Math.floor(process.uptime()) }); }
  catch (error) { console.error(error); res.status(503).json({ ok: false, service: "aurex-api", database: "unavailable" }); }
});
app.use("/api/auth", authRoutes);

async function runDeviceTest(req, res, commandType, payload = {}) {
  try {
    const token = String(req.headers["x-aurex-device-token"] || "").trim();
    if (!token) return res.status(401).json({ error: "Missing device token" });
    if (commandType === "open_url" && !/^https?:\/\//i.test(String(payload.url || ""))) return res.status(400).json({ error: "open_url requires an http(s) URL" });
    const deviceResult = await query(
      `select id, user_id, name from desktop_devices where token_hash = $1 and user_id = $2 limit 1`,
      [hashToken(token), req.user.sub]
    );
    const device = deviceResult.rows[0];
    if (!device) return res.status(401).json({ error: "Invalid device token" });
    const id = require("crypto").randomUUID();
    await query(`insert into desktop_commands (id, device_id, user_id, command_type, payload) values ($1, $2, $3, $4, $5::jsonb)`, [id, device.id, device.user_id, commandType, JSON.stringify(payload)]);
    await recordAudit({
      userId: device.user_id,
      deviceId: device.id,
      commandId: id,
      eventType: "command.created",
      metadata: { command_type: commandType, source: "device_test" }
    });
    await requeueStaleCommands(device.id);
    const ws = desktopSockets.get(device.id);
    if (ws && ws.readyState === 1) {
      const claimed = await query(
        "update desktop_commands set status = 'dispatched' where id = $1 and status = 'queued' returning id, command_type, payload",
        [id]
      );
      if (claimed.rows[0]) {
        ws.send(JSON.stringify({ type: "command", command: claimed.rows[0] }));
        await recordAudit({
          userId: device.user_id,
          deviceId: device.id,
          commandId: id,
          eventType: "command.dispatched",
          metadata: { command_type: commandType, source: "device_test" }
        });
      }
    }
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const result = await query(`select status, result from desktop_commands where id = $1 and device_id = $2 limit 1`, [id, device.id]);
      const row = result.rows[0];
      if (row && row.status !== "queued" && row.status !== "dispatched") return res.json({ ok: row.status === "completed", device: { id: device.id, name: device.name }, command: { id, status: row.status, result: row.result || {} } });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return res.status(504).json({ ok: false, device: { id: device.id, name: device.name }, command: { id, status: "queued" }, error: "Desktop agent did not respond within 5 seconds" });
  } catch (error) { console.error(error); return res.status(500).json({ error: `Could not run desktop ${commandType} test` }); }
}

app.post("/api/desktop/ping", authMiddleware, (req, res) => runDeviceTest(req, res, "ping"));
app.post("/api/desktop/system-info", authMiddleware, (req, res) => runDeviceTest(req, res, "get_system_info"));
app.post("/api/desktop/open-url", authMiddleware, (req, res) => runDeviceTest(req, res, "open_url", { url: String(req.body?.url || "") }));
app.use("/api/desktop", desktopRoutes);

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try { const result = await query("select id, email, created_at from users where id = $1", [req.user.sub]); if (!result.rows[0]) return res.status(404).json({ error: "User not found" }); res.json({ user: result.rows[0] }); }
  catch (error) { console.error(error); res.status(500).json({ error: "Internal server error" }); }
});
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: "Internal server error" }); });

const server = http.createServer(app);
const desktopWss = new WebSocketServer({ server, path: "/desktop/ws", maxPayload: 8 * 1024 * 1024 });

desktopWss.on("connection", async (ws, request) => {
  try {
    const auth = String(request.headers.authorization || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) return ws.close(1008, "Missing device token");
    const deviceResult = await query(`select id, user_id, name from desktop_devices where token_hash = $1 limit 1`, [hashToken(token)]);
    const device = deviceResult.rows[0];
    if (!device) return ws.close(1008, "Invalid device token");

    ws.deviceId = device.id;
    ws.userId = device.user_id;
    desktopSockets.set(device.id, ws);
    registerDesktopSocket(device.id, ws);
    await query("update desktop_devices set last_seen_at = now() where id = $1", [device.id]);
    await recordAudit({
      userId: device.user_id,
      deviceId: device.id,
      eventType: "device.connected",
      metadata: { device_name: device.name }
    });

    ws.send(JSON.stringify({ type: "connected", device: { id: device.id, name: device.name } }));
    await requeueStaleCommands(device.id);
    await dispatchNextQueuedCommand(device.id);

    ws.on("error", error => {
      console.error("Desktop websocket error:", error);
    });

    ws.on("message", async raw => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === "heartbeat") {
          touchDesktopHeartbeat(device.id);
          await query("update desktop_devices set last_seen_at = now() where id = $1", [device.id]);
          await requeueStaleCommands(device.id);
          await dispatchNextQueuedCommand(device.id);
          return;
        }

        if (message.type === "result" && message.commandId) {
          const commandStatus = message.ok ? "completed" : "failed";
          await query(
            `update desktop_commands
             set status = $1, result = $2::jsonb, completed_at = now()
             where id = $3 and device_id = $4 and user_id = $5 and status in ('dispatched', 'queued')`,
            [commandStatus, JSON.stringify(message.result || {}), message.commandId, device.id, device.user_id]
          );
          await recordAudit({
            userId: device.user_id,
            deviceId: device.id,
            commandId: message.commandId,
            eventType: `command.${commandStatus}`,
            metadata: { command_type: message.commandType || "unknown" }
          });
          await query("update desktop_devices set last_seen_at = now() where id = $1", [device.id]);
          await dispatchNextQueuedCommand(device.id);
        }
      } catch (error) { console.error("Desktop websocket message error:", error); }
    });

    ws.on("close", () => {
      removeDesktopSocket(device.id, ws);
      if (desktopSockets.get(device.id) === ws) desktopSockets.delete(device.id);
      recordAudit({
        userId: device.user_id,
        deviceId: device.id,
        eventType: "device.disconnected",
        metadata: { device_name: device.name }
      });
    });
  } catch (error) {
    console.error("Desktop websocket connection error:", error);
    ws.close(1011, "Desktop agent connection error");
  }
});

async function startServer() {
  await ensureAuditTable();
  server.listen(PORT, () => console.log(`Aurex API running on http://localhost:${PORT}`));
}

startServer().catch(error => {
  console.error("Aurex startup failed:", error);
  process.exit(1);
});
