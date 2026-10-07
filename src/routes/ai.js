const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { query } = require("../db");
const { recordAudit } = require("../audit");

const router = express.Router();
router.use(authMiddleware);

function normalize(text) {
  return String(text || "").trim().toLowerCase().replace(/[?!.,]/g, " ").replace(/\s+/g, " ");
}

function intentFor(text) {
  const t = normalize(text);
  const has = (...words) => words.some(word => t.includes(word));

  if (/^(hi|hello|hey|vanakkam|வணக்கம்|hai)\b/.test(t) || has("hi aurex", "hello aurex", "vanakkam aurex")) return { intent: "greeting" };
  if (has("status", "online", "offline", "connected", "heartbeat", "device health", "pc online", "pc online ah", "pc online a", "pc onlin", "en pc online", "en pc online ah", "en pc onlin", "என் pc online", "கம்ப்யூட்டர் online")) return { intent: "device_status" };
  if (has("ping", "are you there", "is my pc online", "aurex ping", "ping pannu", "ping pan", "ping பண்ணு", "பிங் பண்ணு")) return { intent: "ping", requires_confirmation: true };
  if (has("system info", "system information", "cpu", "memory", "ram", "windows version", "evlo ram", "evlo memory", "ram evlo", "system details", "system detail", "system info kudu", "system info kaatu", "system info venum", "எவ்வளவு ram", "ராம் எவ்வளவு")) return { intent: "get_system_info", requires_confirmation: true };
  if (has("screenshot", "screen shot", "show my screen", "pc screen", "screen kaatu", "screen காட்ட", "screen kudu", "screen காட்டுங்க", "en screen", "என் screen", "திரை காட்டு")) return { intent: "capture_screenshot", requires_confirmation: true };
  if (has("open url", "open website", "open site", "website open", "site open", "google open", "open google", "google thira", "google திற", "open pannu", "open pan")) return { intent: "open_url", requires_confirmation: true };
  return { intent: "unknown" };
}

router.post("/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim().slice(0, 1000);
    if (!message) return res.status(400).json({ error: "Message is required" });
    const result = intentFor(message);
    let reply = "";
    if (result.intent === "greeting") {
      reply = "Vanakkam partner 👋 Naan Aurex. Device status, system info, screenshot, ping, and safe desktop actions-ku help panna ready.";
    } else if (result.intent === "device_status") {
      const d = await query("select id, name, last_seen_at, heartbeat_at from desktop_devices where user_id = $1 order by created_at desc limit 1", [req.user.sub]);
      if (!d.rows[0]) reply = "No paired desktop device found.";
      else { const age = d.rows[0].heartbeat_at ? Date.now() - new Date(d.rows[0].heartbeat_at).getTime() : Infinity; const online = age <= 90000; reply = `Paired device: ${d.rows[0].name}. Status: ${online ? "Online 🟢" : "Offline 🔴"}. Last seen: ${d.rows[0].last_seen_at ? new Date(d.rows[0].last_seen_at).toLocaleString() : "never"}.`; }
    } else if (result.intent === "unknown") {
      reply = "Puriyuthu partner, but that request is not enabled yet. Try: “en PC online ah?”, “en system la evlo RAM?”, “en screen kaatu”, or “Google open pannu”.";
    } else {
      reply = `I can prepare a safe "${result.intent}" action. Confirmation is required before Aurex sends it to your PC.`;
    }
    await recordAudit({ userId: req.user.sub, eventType: "ai.chat", metadata: { intent: result.intent, message_length: message.length } });
    res.json({ reply, intent: result.intent, requires_confirmation: Boolean(result.requires_confirmation) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Aurex Brain is temporarily unavailable" });
  }
});

module.exports = router;
