// settings.js – Module settings registration

export function registerSettings() {
  game.settings.register("npc-forge", "anthropicKey", {
    name: "Anthropic API Key",
    hint: "Your Claude API key from console.anthropic.com",
    scope: "world", config: true, type: String, default: ""
  });
  game.settings.register("npc-forge", "imageProvider", {
    name: "Image Generator",
    hint: "Which AI service to use for NPC portraits",
    scope: "world", config: true, type: String,
    choices: { "imagen": "Google Imagen 3 (recommended)", "dalle": "OpenAI DALL-E 3" },
    default: "imagen"
  });
  game.settings.register("npc-forge", "imageApiKey", {
    name: "Image API Key",
    hint: "Gemini API key (for Imagen 3) or OpenAI API key (for DALL-E 3)",
    scope: "world", config: true, type: String, default: ""
  });
  game.settings.register("npc-forge", "builderPosition", {
    name: "NPC Builder Position",
    scope: "client", config: true, type: String,
    choices: { "sidebar": "Option A – Own sidebar panel (recommended)", "actor": "Option B – Tab in Actor creation dialog" },
    default: "sidebar"
  });
  game.settings.register("npc-forge", "raceDatabase", { scope: "world", config: false, type: String, default: "[]" });
  game.settings.register("npc-forge", "classDatabase", { scope: "world", config: false, type: String, default: "[]" });
}
export function getSetting(key) { return game.settings.get("npc-forge", key); }
export async function setSetting(key, value) { return game.settings.set("npc-forge", key, value); }
export function getRaceDatabase() { try { return JSON.parse(getSetting("raceDatabase")); } catch { return []; } }
export function getClassDatabase() { try { return JSON.parse(getSetting("classDatabase")); } catch { return []; } }
export async function saveRaceDatabase(data) { await setSetting("raceDatabase", JSON.stringify(data)); }
export async function saveClassDatabase(data) { await setSetting("classDatabase", JSON.stringify(data)); }
