function normalizeShortcutText(message) {
  return String(message || "")
    .toLowerCase()
    .replace(/[?!.\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function offlineReadOnlyShortcut(message) {
  const text = normalizeShortcutText(message);
  if (/^(en )?(oda |my )?pc (online ah|online|status enna|status)$/.test(text) ||
      /^(is )?(my )?pc online$/.test(text) ||
      /pc online ah/.test(text) ||
      /^en pc online ah$/.test(text)) return "get_pc_status";
  if (/^(en )?(pc|system) (system info|details|information|ram details)$/.test(text) ||
      /^(get )?(pc|system) (info|information|details)$/.test(text) ||
      /evlo ram/.test(text)) return "get_system_info";
  if (/^(ping|ping pc|ping device|pc ping)$/.test(text)) return "ping_pc";
  return null;
}

module.exports = { normalizeShortcutText, offlineReadOnlyShortcut };
