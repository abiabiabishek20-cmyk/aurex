const OPENAI_URL = "https://api.openai.com/v1/responses";
const { runAssistantTool, TOOL_DEFINITIONS } = require("./tools");
const { personaInstructions } = require("./persona");

const SYSTEM_INSTRUCTIONS = personaInstructions() + `


You are Aurex, a personal AI assistant for the authenticated owner.

Language and style:
- Understand Tamil, Tanglish, and English naturally, including mixed sentences.
- Reply in the user's language mix when appropriate. Keep replies clear and conversational.
- Remember the conversation context supplied to you and use it for follow-up questions.
- Use recall_memory when long-term context is needed. Use remember only when the user explicitly asks you to remember or save something.
- Never pretend an action happened unless a tool result confirms it.

Tool and safety rules:
- Use tools when the user asks about their PC or asks Aurex to act on their PC.
- Read-only PC diagnostics can be executed directly.
- Browser navigation changes external state, so open_url_on_pc always requires explicit confirmation.
- Never invent tools, device state, screenshots, messages, files, deployments, or successful actions.
- Do not request or expose secrets, passwords, device tokens, JWTs, or API keys.
- Do not use arbitrary shell commands, arbitrary mouse/keyboard injection, hidden persistence, credential extraction, or destructive filesystem operations.
- If a requested capability is not available yet, explain that it is being built rather than pretending it exists.

Aurex is being built as a tool-using assistant. For actions that require confirmation, clearly tell the user what will happen and ask them to confirm.
`;

function extractOutputText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) return response.output_text.trim();
  const parts = [];
  for (const item of response?.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) if (content.type === "output_text" && content.text) parts.push(content.text);
  }
  return parts.join("\n").trim();
}
async function callOpenAI(body) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is not configured on the Aurex server.");
    error.code = "OPENAI_NOT_CONFIGURED";
    throw error;
  }
  const response = await fetch(OPENAI_URL, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || `OpenAI request failed with HTTP ${response.status}`);
    error.status = response.status;
    error.code = data?.error?.code || "OPENAI_REQUEST_FAILED";
    throw error;
  }
  return data;
}
async function runAssistant({ userId, conversationMessages, userMessage, conversationId }) {
  let input = [...conversationMessages.map(row => ({ role: row.role, content: row.content })), { role: "user", content: userMessage }];
  const artifacts = [];
  const actions = [];
  for (let round = 0; round < 4; round += 1) {
    const response = await callOpenAI({
      model: process.env.AUREX_MODEL || "gpt-6-luna",
      instructions: SYSTEM_INSTRUCTIONS,
      input,
      tools: [...TOOL_DEFINITIONS, { type: "web_search" }],
      tool_choice: "auto",
      parallel_tool_calls: false,
      max_output_tokens: 1200,
      store: false,
      safety_identifier: String(userId)
    });
    const calls = (response.output || []).filter(item => item.type === "function_call");
    if (!calls.length) return { reply: extractOutputText(response) || "I’m here, partner. What should we do next?", artifacts, actions, model: response.model || process.env.AUREX_MODEL || "gpt-6-luna" };
    input = [...input, ...(response.output || [])];
    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.arguments || "{}"); } catch {}
      let result;
      try { result = await runAssistantTool({ userId, conversationId, name: call.name, args }); }
      catch (error) { result = { ok: false, message: error.message || "Tool execution failed." }; }
      if (result.artifact) {
        artifacts.push(result.artifact);
        result = { ...result, artifact: { type: result.artifact.type, available: true } };
      }
      if (result.confirmation_required) actions.push({ id: result.action_id, tool: result.action.tool, url: result.action.url, expires_in_seconds: result.action.expires_in_seconds });
      input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
    }
  }
  return { reply: "I reached the tool-step limit for this request. Tell me the next step and I’ll continue.", artifacts, actions, model: process.env.AUREX_MODEL || "gpt-6-luna" };
}
module.exports = { runAssistant };
