const MODULES = Object.freeze([
  { id: "core", name: "AUREX CORE", capability: "Intelligence & orchestration", state: "active" },
  { id: "voice", name: "AUREX VOICE", capability: "Speech recognition & voice response", state: "planned" },
  { id: "memory", name: "AUREX MEMORY", capability: "Controllable long-term memory", state: "active" },
  { id: "research", name: "AUREX RESEARCH", capability: "Web research & synthesis", state: "active" },
  { id: "create", name: "AUREX CREATE", capability: "Starter project source generation", state: "in_progress" },
  { id: "content", name: "AUREX CONTENT", capability: "Social content workflows", state: "planned" },
  { id: "automation", name: "AUREX AUTOMATION", capability: "Safe computer & workflow automation", state: "active" },
  { id: "manager", name: "AUREX MANAGER", capability: "Persistent tasks & multi-step planning", state: "active" }
]);

function getModules() {
  return MODULES.map(module => ({ ...module }));
}

function getModule(id) {
  return MODULES.find(module => module.id === id) || null;
}

module.exports = { MODULES, getModules, getModule };
