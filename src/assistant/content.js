const SUPPORTED_PLATFORMS = Object.freeze([
  "instagram", "facebook", "linkedin", "youtube", "whatsapp", "other"
]);

function createContentDraft(input = {}) {
  const platform = String(input.platform || "instagram").trim().toLowerCase();
  const topic = String(input.topic || "").trim().slice(0, 300);
  const caption = String(input.caption || "").trim().slice(0, 5000);
  const language = String(input.language || "English").trim().slice(0, 40);
  const tone = String(input.tone || "natural").trim().slice(0, 80);
  const callToAction = String(input.call_to_action || "").trim().slice(0, 300);
  const hashtags = Array.isArray(input.hashtags)
    ? input.hashtags.slice(0, 20).map(tag => String(tag).trim().replace(/^#+/, "").replace(/[^a-zA-Z0-9_]/g, "")).filter(Boolean)
    : [];

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return { ok: false, message: "Unsupported platform. Choose Instagram, Facebook, LinkedIn, YouTube, WhatsApp, or other." };
  }
  if (!topic || !caption) {
    return { ok: false, message: "A topic and caption are required to prepare a content draft." };
  }

  return {
    ok: true,
    published: false,
    draft: {
      platform,
      topic,
      language,
      tone,
      caption,
      hashtags: [...new Set(hashtags)],
      call_to_action: callToAction
    },
    message: "Content draft prepared. It has not been published or sent anywhere."
  };
}

module.exports = { createContentDraft, SUPPORTED_PLATFORMS };
