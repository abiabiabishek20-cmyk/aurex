const OPENAI_URL = "https://api.openai.com/v1/responses";

async function runResearch({ userId, query }) {
  if (!process.env.OPENAI_API_KEY) return { ok: false, message: "Web research is not configured yet." };
  if (!query.trim()) return { ok: false, message: "Research query is required." };
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.AUREX_MODEL || "gpt-6-luna",
      instructions: "Research the user query using current web information. Give a concise synthesis and include source URLs when available. Do not invent facts or sources.",
      input: query,
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      store: false,
      safety_identifier: String(userId),
      max_output_tokens: 1400
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, message: data?.error?.message || `Research provider returned HTTP ${response.status}` };
  return { ok: true, query, answer: data.output_text || "No research summary was returned.", response_id: data.id || null };
}

module.exports = { runResearch };
