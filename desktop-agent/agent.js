const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const os = require("os");
const { execFile } = require("child_process");
const WebSocket = require("ws");

const API_URL = String(process.env.AUREX_API_URL || "https://aurex-api-cvpd.onrender.com").replace(/\/$/, "");
const DEVICE_TOKEN = String(process.env.AUREX_DEVICE_TOKEN || "");

if (!DEVICE_TOKEN) {
  console.error("AUREX_DEVICE_TOKEN is required.");
  process.exit(1);
}

const wsUrl = API_URL.replace(/^http/i, "ws") + "/desktop/ws";

function systemInfo() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpu_count: os.cpus().length,
    total_memory_mb: Math.round(os.totalmem() / 1024 / 1024),
    free_memory_mb: Math.round(os.freemem() / 1024 / 1024),
    uptime_seconds: Math.round(os.uptime())
  };
}

function openUrl(url) {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Only http(s) URLs are allowed");
  }

  if (process.platform === "win32") {
    execFile("cmd.exe", ["/c", "start", "", url]);
    return { opened: true, url };
  }

  const command = process.platform === "darwin" ? "open" : "xdg-open";
  execFile(command, [url]);
  return { opened: true, url };
}

function captureScreenshot() {
  if (process.platform !== "win32") {
    throw new Error("Screenshot capture is currently supported on Windows only");
  }

  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bitmap.Size)
$stream = New-Object System.IO.MemoryStream
$bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Jpeg)
[Console]::Write([Convert]::ToBase64String($stream.ToArray()))
$graphics.Dispose()
$bitmap.Dispose()
$stream.Dispose()
`;

  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], { maxBuffer: 12 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr.trim() || error.message));
      const image = String(stdout || "").trim();
      if (!image) return reject(new Error("Screenshot capture returned no image data"));
      resolve({ mime_type: "image/jpeg", data_base64: image });
    });
  });
}

async function execute(command) {
  switch (command.command_type) {
    case "ping":
      return { pong: true, at: new Date().toISOString() };

    case "get_system_info":
      return systemInfo();

    case "open_url":
      return openUrl(String(command.payload?.url || ""));

    case "capture_screenshot":
      return await captureScreenshot();

    default:
      throw new Error("Command type is not allowed by this agent");
  }
}

function connect() {
  const ws = new WebSocket(wsUrl, {
    headers: { Authorization: `Bearer ${DEVICE_TOKEN}` }
  });

  ws.on("open", () => {
    console.log("Aurex Desktop Agent connected.");
    ws.send(JSON.stringify({ type: "heartbeat" }));
  });

  ws.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type !== "command" || !message.command?.id) {
        return;
      }

      const command = message.command;
      try {
        const result = await execute(command);
        ws.send(JSON.stringify({
          type: "result",
          commandId: command.id,
          ok: true,
          result
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: "result",
          commandId: command.id,
          ok: false,
          result: { error: error.message }
        }));
      }
    } catch (error) {
      console.error("Invalid server message:", error.message);
    }
  });

  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "heartbeat" }));
    }
  }, 30000);

  ws.on("close", () => {
    clearInterval(heartbeat);
    console.log("Aurex Desktop Agent disconnected. Reconnecting in 5 seconds...");
    setTimeout(connect, 5000);
  });

  ws.on("error", (error) => {
    console.error("Desktop Agent connection error:", error.message);
  });
}

console.log(`Aurex Desktop Agent starting for ${API_URL}`);
connect();
