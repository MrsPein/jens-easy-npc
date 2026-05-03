// main.js – NPC Forge entry point (Foundry v13)

import { registerSettings } from "./settings.js";
import { NpcForgeSidebar } from "./sidebar-panel.js";

let _panel = null;

function getPanel() {
  if (!_panel) _panel = new NpcForgeSidebar();
  return _panel;
}

Hooks.once("init", () => {
  console.log("NPC Forge | Initialising...");
  registerSettings();
  Handlebars.registerHelper("eq", (a, b) => a === b);
});

Hooks.once("ready", () => {
  console.log("NPC Forge | Ready.");
  _injectSidebarButton();
});

// v13: sidebar renders after ready, use renderSidebar hook
Hooks.on("renderSidebar", () => {
  _injectSidebarButton();
});

function _injectSidebarButton() {
  // v13 sidebar tab selectors
  const selectors = [
    "#sidebar nav.tabs",
    "#sidebar .tabs[data-group='sidebar']",
    ".sidebar-tabs",
    "#sidebar-tabs"
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;
    if (el.querySelector("[data-npcforge]")) return; // already added

    const btn = document.createElement("a");
    btn.dataset.npcforge = "1";
    btn.dataset.tooltip = "NPC Forge – Jen's easy NPC";
    btn.setAttribute("aria-label", "NPC Forge");
    btn.setAttribute("role", "tab");
    btn.style.cssText = "cursor:pointer;display:flex;align-items:center;justify-content:center;";
    btn.innerHTML = `<i class="fas fa-user-plus"></i>`;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const panel = getPanel();
      panel.rendered ? panel.close() : panel.render(true);
    });

    el.appendChild(btn);
    console.log("NPC Forge | Sidebar button injected into", sel);
    return;
  }

  console.warn("NPC Forge | Could not find sidebar tabs element. Tried:", selectors);
}

window.NpcForge = {
  open: () => getPanel().render(true),
  panel: getPanel
};
