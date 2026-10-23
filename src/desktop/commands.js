const COMMAND_DEFINITIONS = Object.freeze({
  ping: { payload: "empty" },
  get_system_info: { payload: "empty" },
  open_url: { payload: "open_url" },
  capture_screenshot: { payload: "empty" },
  ollama_chat: { payload: "ollama_chat" }
});

const MAX_PAYLOAD_BYTES = 8192;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateCommand(commandType, rawPayload = {}) {
  const type = String(commandType || "");
  const definition = COMMAND_DEFINITIONS[type];
  if (!definition) {
    return { ok: false, error: "Invalid device or command type" };
  }

  if (!isPlainObject(rawPayload)) {
    return { ok: false, error: "Command payload must be a JSON object" };
  }

  const payload = { ...rawPayload };
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: "Command payload is too large" };
  }

  if (definition.payload === "empty") {
    if (Object.keys(payload).length) {
      return { ok: false, error: `${type} does not accept a payload` };
    }
    return { ok: true, payload: {} };
  }

  if (definition.payload === "ollama_chat") {
    const messages = payload.messages;
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 8) {
      return { ok: false, error: "ollama_chat requires 1 to 8 messages" };
    }
    const clean = [];
    for (const item of messages) {
      if (!isPlainObject(item) || !["system", "user", "assistant"].includes(item.role) ||
          typeof item.content !== "string" || !item.content.trim() || item.content.length > 1200) {
        return { ok: false, error: "Invalid Ollama chat message" };
      }
      clean.push({ role: item.role, content: item.content });
    }
    return { ok: true, payload: { messages: clean } };
  }

  if (definition.payload === "open_url") {
    const value = String(payload.url || "").trim();
    if (!/^https?:\/\//i.test(value)) {
      return { ok: false, error: "open_url requires an http(s) URL" };
    }

    try {
      const url = new URL(value);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
        return { ok: false, error: "open_url accepts only standard http(s) URLs" };
      }
      return { ok: true, payload: { url: url.toString() } };
    } catch {
      return { ok: false, error: "open_url requires a valid http(s) URL" };
    }
  }

  return { ok: false, error: "Unsupported command definition" };
}

module.exports = { COMMAND_DEFINITIONS, MAX_PAYLOAD_BYTES, validateCommand };
