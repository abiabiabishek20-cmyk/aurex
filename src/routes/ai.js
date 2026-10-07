const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { query } = require("../db");
const { recordAudit } = require("../audit");

const router = express.Router();
router.use(authMiddleware);

function normalize(text) { return String(text || "").trim().toLowerCase(); }
function intentFor(text) {
  const t = normalize(text);
  if (/^(hi|hello|hey|vanakkam|வணக்கம்)\b/.test(t)) return { intent: "greeting" };
  if (/(status|online|offline|connected|heartbeat|device health)/.test(t)) return { intent: "device_status" };
  if (/(ping|are you there|is my pc online)/.test(t)) return { intent: "ping", requires_confirmation: true };
  if (/(system info|system information|cpu|memory|ram|windows version)/.test(t)) return { intent: "get_system_info", requires_confirmation: true };
  if (/(screenshot|screen shot|show my screen|pc screen)/.test(t)) return { intent: "capture_screenshot", requires_confirmation: true };
  if (/(open url|open website|open site)/.test(t)) return { intent: "open_url", requires_confirmation: true };
  return { intent: "unknown" };
}

router.post("/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim().slice(0, 1000);
    if (!message) return res.status(400).json({ error: "Message is required" });
    const result = intentFor(message);
    let reply = "";
    if (result.intent === "greeting") reply = "Vanakkam partner 👋 Naan Aurex. Device status, system info, screenshot, ping, and safe desktop actions-ku help panna ready.";
    else if (result.intent === "device_status") {
      const d = await query("select id, name, last_seen_at from desktop_devices where user_id = $1 order by created_at desc limit 1", [req.user.sub]);
      if (!d.rows[0]) reply = "No paired desktop device found.";
      else reply = `Paired device: ${d.rows[0].name}. Last seen: ${d.rows[0].last_seen_at ? new Date(d.rows[0].last_seen_at).toLocaleString() : "never"}.`;
    } else if (result.intent === "unknown") reply = "I understand the message, but that intent is not enabled yet. Try: is my PC online?, get system info, or take a screenshot.";
    else reply = `I can prepare a safe "${result.intent}" action. Confirmation is required before Aurex sends it to your PC.`;
    await recordAudit({ userId: req.user.sub, eventType: "ai.chat", metadata: { intent: result.intent, message_length: message.length } });
    res.json({ reply, intent: result.intent, requires_confirmation: Boolean(result.requires_confirmation) });
  } catch (error) { console.error(error); res.status(500).json({ error: "Aurex Brain is temporarily unavailable" }); }
});

module.exports = router;