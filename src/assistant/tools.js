const { query } = require("../db");
const { createPendingAction, saveMemory, searchMemories } = require("./store");
const { executeDesktopCommand } = require("../routes/desktop");
const { runResearch } = require("./research");

const TOOL_DEFINITIONS = [
  { type: "function", name: "remember", description: "Save a useful user-approved fact or preference to Aurex private memory. Use only when the user explicitly asks you to remember/save something.", parameters: { type: "object", properties: { content: { type: "string", description: "The fact or preference to remember." }, category: { type: "string", description: "Short category such as preference, project, workflow, or general." } }, required: ["content"], additionalProperties: false }, strict: true },
  { type: "function", name: "recall_memory", description: "Search Aurex private long-term memory for information relevant to the user's request.", parameters: { type: "object", properties: { query: { type: "string", description: "A concise phrase to search for." } }, required: ["query"], additionalProperties: false }, strict: true },
  { type: "function", name: "research_web", description: "Research a topic using current web information and return a concise sourced synthesis.", parameters: { type: "object", properties: { query: { type: "string", description: "The research question or topic." } }, required: ["query"], additionalProperties: false }, strict: true },
  { type: "function", name: "create_plan", description: "Turn a user's requested project or task into a safe, structured execution plan. Planning only: do not create files, deploy, send messages, or change external state.", parameters: { type: "object", properties: { request: { type: "string", description: "The user's project or task request." }, goal: { type: "string", description: "Optional concise desired outcome." } }, required: ["request"], additionalProperties: false }, strict: true },
  { type: "function", name: "get_pc_status", description: "Check whether the user's paired Windows PC is online and report its latest heartbeat.", parameters: { type: "object", properties: {}, additionalProperties: false }, strict: true },
  { type: "function", name: "ping_pc", description: "Ping the user's paired Windows PC to verify that the desktop agent responds.", parameters: { type: "object", properties: {}, additionalProperties: false }, strict: true },
  { type: "function", name: "get_system_info", description: "Read safe system diagnostics from the user's paired Windows PC, such as RAM, CPU cores, OS, architecture, hostname and uptime.", parameters: { type: "object", properties: {}, additionalProperties: false }, strict: true },
  { type: "function", name: "capture_pc_screenshot", description: "Capture the current screen of the user's paired Windows PC. This is a read-only diagnostic action.", parameters: { type: "object", properties: {}, additionalProperties: false }, strict: true },
  { type: "function", name: "open_url_on_pc", description: "Open a normal http(s) URL in the user's paired PC browser. This changes the browser state, so Aurex must request confirmation before executing it.", parameters: { type: "object", properties: { url: { type: "string", description: "A complete http(s) URL." } }, required: ["url"], additionalProperties: false }, strict: true }
];

function cleanUrl(raw) {
  const value = String(raw || "").trim();
  if (!/^https?:\/\//i.test(value)) throw new Error("Only http(s) URLs are allowed.");
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Only standard http(s) URLs are allowed.");
  return url.toString();
}
async function latestDevice(userId) {
  const result = await query("select id, name, last_seen_at from desktop_devices where user_id = $1 order by created_at desc limit 1", [userId]);
  return result.rows[0] || null;
}
async function runAssistantTool({ userId, conversationId, name, args, confirmed = false }) {
  if (name === "create_plan") {
    const request = String(args?.request || "").trim().slice(0, 2000);
    if (!request) return { ok: false, message: "A planning request is required." };
    const goal = String(args?.goal || "").trim().slice(0, 500) || request;
    const lower = request.toLowerCase();
    const phases = [];
    if (/(app|website|web|software|project|code|create|build)/.test(lower)) {
      phases.push(
        { id: 1, title: "Understand", actions: ["Clarify the requested outcome, constraints, inputs and success criteria."] },
        { id: 2, title: "Design", actions: ["Define architecture, screens or components, data flow and safe tool boundaries."] },
        { id: 3, title: "Build", actions: ["Implement the smallest working slice with isolated, reviewable changes."] },
        { id: 4, title: "Verify", actions: ["Run available tests, inspect errors and verify the requested behavior."] },
        { id: 5, title: "Deliver", actions: ["Prepare the result and only perform external deployment or publishing after explicit confirmation."] }
      );
    } else {
      phases.push(
        { id: 1, title: "Understand", actions: ["Identify the desired outcome, constraints and success criteria."] },
        { id: 2, title: "Plan", actions: ["Break the request into small, ordered steps and identify dependencies."] },
        { id: 3, title: "Execute", actions: ["Carry out safe steps and keep external side effects behind confirmation."] },
        { id: 4, title: "Verify", actions: ["Check the result against the success criteria and report anything incomplete."] }
      );
    }
    return { ok: true, planning_only: true, goal, request, phases };
  }
  if (name === "research_web") return runResearch({ userId, query: String(args?.query || "").slice(0, 1000) });
  if (name === "remember") {
    const id = await saveMemory(userId, args?.content, args?.category);
    return { ok: true, memory_id: id, message: "Saved to Aurex private memory." };
  }
  if (name === "recall_memory") {
    const memories = await searchMemories(userId, args?.query, 8);
    return { ok: true, memories };
  }
  if (name === "get_pc_status") {
    const device = await latestDevice(userId);
    if (!device) return { ok: false, message: "No paired desktop device found." };
    const ageSeconds = device.last_seen_at ? Math.max(0, Math.floor((Date.now() - new Date(device.last_seen_at).getTime()) / 1000)) : null;
    const online = ageSeconds !== null && ageSeconds <= 90;
    return { ok: true, device: { name: device.name, online, last_seen_at: device.last_seen_at, last_seen_age_seconds: ageSeconds } };
  }
  if (name === "open_url_on_pc") {
    const url = cleanUrl(args?.url);
    if (!confirmed) {
      const actionId = await createPendingAction(userId, conversationId, name, { url });
      return { ok: true, confirmation_required: true, action_id: actionId, action: { tool: name, url, expires_in_seconds: 300 }, message: "Opening a website changes the user's browser state. Ask the user for explicit confirmation before executing this action." };
    }
    const device = await latestDevice(userId);
    if (!device) return { ok: false, message: "No paired desktop device found." };
    const result = await executeDesktopCommand(userId, device.id, "open_url", { url }, 7000);
    return { ok: result.ok, device: result.device, command: result.command, message: result.ok ? "Website opened on the PC." : (result.error || "Could not open the website.") };
  }
  const device = await latestDevice(userId);
  if (!device) return { ok: false, message: "No paired desktop device found." };
  if (name === "ping_pc") {
    const result = await executeDesktopCommand(userId, device.id, "ping", {}, 7000);
    return { ok: result.ok, device: result.device, command: result.command };
  }
  if (name === "get_system_info") {
    const result = await executeDesktopCommand(userId, device.id, "get_system_info", {}, 7000);
    return { ok: result.ok, device: result.device, command: result.command };
  }
  if (name === "capture_pc_screenshot") {
    const result = await executeDesktopCommand(userId, device.id, "capture_screenshot", {}, 10000);
    const screenshot = result.command?.result?.screenshot_base64;
    return { ok: result.ok, device: result.device, command: { id: result.command?.id, status: result.command?.status }, artifact: screenshot ? { type: "image", mime_type: "image/jpeg", base64: screenshot } : null };
  }
  return { ok: false, message: "Tool is not available." };
}
module.exports = { TOOL_DEFINITIONS, runAssistantTool };
