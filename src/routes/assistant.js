const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { getOrCreateConversation, loadMessages, addMessage, consumePendingAction } = require("../assistant/store");
const { runAssistant } = require("../assistant/llm");
const { runAssistantTool } = require("../assistant/tools");
const { recordAudit } = require("../audit");

const assistantRate = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
function allowAssistant(userId) {
  const now = Date.now();
  const entry = assistantRate.get(userId);
  if (!entry || now - entry.startedAt >= RATE_WINDOW_MS) {
    assistantRate.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}
setInterval(() => { const cutoff = Date.now() - RATE_WINDOW_MS; for (const [userId, entry] of assistantRate) if (entry.startedAt < cutoff) assistantRate.delete(userId); }, RATE_WINDOW_MS).unref();

const router = express.Router();
router.use(authMiddleware);

router.post("/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim().slice(0, 4000);
    if (!message) return res.status(400).json({ error: "Message is required" });
    if (!allowAssistant(req.user.sub)) return res.status(429).json({ error: "Aurex Assistant rate limit exceeded", retry_after_seconds: 60 });
    const conversationId = await getOrCreateConversation(req.user.sub, req.body?.conversation_id || null);
    const history = await loadMessages(req.user.sub, conversationId, 30);
    await addMessage(req.user.sub, conversationId, "user", message);
    const result = await runAssistant({ userId: req.user.sub, conversationId, conversationMessages: history, userMessage: message });
    await addMessage(req.user.sub, conversationId, "assistant", result.reply, { model: result.model, action_count: result.actions.length, artifact_count: result.artifacts.length });
    await recordAudit({ userId: req.user.sub, eventType: "assistant.chat", metadata: { conversation_id: conversationId, message_length: message.length, action_count: result.actions.length } });
    res.json({ ok: true, conversation_id: conversationId, reply: result.reply, actions: result.actions, artifacts: result.artifacts, model: result.model });
  } catch (error) {
    console.error("Aurex assistant chat error:", error);
    if (error.code === "OPENAI_NOT_CONFIGURED") return res.status(503).json({ error: "Aurex AI provider is not configured yet.", code: "OPENAI_NOT_CONFIGURED" });
    res.status(500).json({ error: "Aurex Assistant is temporarily unavailable." });
  }
});

router.post("/confirm", async (req, res) => {
  try {
    const actionId = String(req.body?.action_id || "").trim();
    if (!actionId) return res.status(400).json({ error: "action_id is required" });
    const action = await consumePendingAction(req.user.sub, actionId);
    if (!action) return res.status(404).json({ error: "Action not found, expired, or already used" });
    const result = await runAssistantTool({ userId: req.user.sub, conversationId: action.conversation_id, name: action.tool_name, args: action.arguments, confirmed: true });
    if (result.confirmation_required) return res.status(409).json({ error: "Action still requires confirmation" });
    const reply = result.ok ? "Done partner. The confirmed action completed successfully." : `I couldn't complete that action: ${result.message || "unknown error"}`;
    await addMessage(req.user.sub, action.conversation_id, "assistant", reply, { confirmed_action: action.tool_name, action_id: action.id, ok: result.ok });
    res.json({ ok: result.ok, conversation_id: action.conversation_id, reply, result });
  } catch (error) {
    console.error("Aurex assistant confirmation error:", error);
    res.status(500).json({ error: "Could not execute confirmed Aurex action." });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const messages = await loadMessages(req.user.sub, req.params.id, 100);
    res.json({ conversation_id: req.params.id, messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load conversation." });
  }
});

module.exports = router;
