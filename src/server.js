require("dotenv").config();

const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const authRoutes = require("./routes/auth");
const { router: desktopRoutes, hashToken } = require("./routes/desktop");
const { authMiddleware } = require("./middleware/auth");
const { query } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const desktopSockets = new Map();

app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await query("select 1");
    res.json({ ok: true, service: "aurex-api", database: "connected" });
  } catch (error) {
    console.error(error);
    res.status(503).json({ ok: false, service: "aurex-api", database: "unavailable" });
  }
});

app.use("/api/auth", authRoutes);

// Safe connection test for a paired desktop agent. The device token is read
// from the local agent config by the caller and is never returned by this API.
app.post("/api/desktop/ping", async (req, res) => {
  try {
    const token = String(req.headers["x-aurex-device-token"] || "").trim();
    if (!token) {
      return res.status(401).json({ error: "Missing device token" });
    }

    const deviceResult = await query(
      `select id, user_id, name
       from desktop_devices
       where token_hash = $1
       limit 1`,
      [hashToken(token)]
    );

    const device = deviceResult.rows[0];
    if (!device) {
      return res.status(401).json({ error: "Invalid device token" });
    }

    const id = require("crypto").randomUUID();
    await query(
      `insert into desktop_commands (id, device_id, user_id, command_type, payload)
       values ($1, $2, $3, 'ping', '{}'::jsonb)`,
      [id, device.id, device.user_id]
    );

    const ws = desktopSockets.get(device.id);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: "command",
        command: { id, command_type: "ping", payload: {} }
      }));
    }

    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const result = await query(
        `select status, result
         from desktop_commands
         where id = $1 and device_id = $2
         limit 1`,
        [id, device.id]
      );

      const row = result.rows[0];
      if (row && row.status !== "queued") {
        return res.json({
          ok: row.status === "completed",
          device: { id: device.id, name: device.name },
          command: { id, status: row.status, result: row.result || {} }
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    res.status(504).json({
      ok: false,
      device: { id: device.id, name: device.name },
      command: { id, status: "queued" },
      error: "Desktop agent did not respond within 5 seconds"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not run desktop ping test" });
  }
});

app.use("/api/desktop", desktopRoutes);

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await query(
      "select id, email, created_at from users where id = $1",
      [req.user.sub]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = http.createServer(app);
const desktopWss = new WebSocketServer({ server, path: "/desktop/ws" });

async function sendNextCommand(ws, deviceId) {
  const result = await query(
    `select id, command_type, payload
     from desktop_commands
     where device_id = $1 and status = 'queued'
     order by created_at asc
     limit 1`,
    [deviceId]
  );

  if (result.rows[0] && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: "command", command: result.rows[0] }));
  }
}

desktopWss.on("connection", async (ws, request) => {
  try {
    const auth = String(request.headers.authorization || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    if (!token) {
      ws.close(1008, "Missing device token");
      return;
    }

    const deviceResult = await query(
      `select id, user_id, name
       from desktop_devices
       where token_hash = $1
       limit 1`,
      [hashToken(token)]
    );

    const device = deviceResult.rows[0];
    if (!device) {
      ws.close(1008, "Invalid device token");
      return;
    }

    ws.deviceId = device.id;
    ws.userId = device.user_id;
    desktopSockets.set(device.id, ws);

    await query(
      "update desktop_devices set last_seen_at = now() where id = $1",
      [device.id]
    );

    ws.send(JSON.stringify({
      type: "connected",
      device: { id: device.id, name: device.name }
    }));

    await sendNextCommand(ws, device.id);

    ws.on("message", async (raw) => {
      try {
        const message = JSON.parse(raw.toString());

        if (message.type === "heartbeat") {
          await query(
            "update desktop_devices set last_seen_at = now() where id = $1",
            [device.id]
          );
          await sendNextCommand(ws, device.id);
          return;
        }

        if (message.type === "result" && message.commandId) {
          await query(
            `update desktop_commands
             set status = $1, result = $2::jsonb, completed_at = now()
             where id = $3 and device_id = $4 and user_id = $5`,
            [
              message.ok ? "completed" : "failed",
              JSON.stringify(message.result || {}),
              message.commandId,
              device.id,
              device.user_id
            ]
          );

          await query(
            "update desktop_devices set last_seen_at = now() where id = $1",
            [device.id]
          );

          await sendNextCommand(ws, device.id);
        }
      } catch (error) {
        console.error("Desktop websocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (desktopSockets.get(device.id) === ws) {
        desktopSockets.delete(device.id);
      }
    });
  } catch (error) {
    console.error("Desktop websocket connection error:", error);
    ws.close(1011, "Desktop agent connection error");
  }
});

server.listen(PORT, () => {
  console.log(`Aurex API running on http://localhost:${PORT}`);
});
