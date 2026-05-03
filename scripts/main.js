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
  // Delay to ensure sidebar is fully rendered
  setTimeout(() => _injectSidebarButton(), 500);
});

Hooks.on("renderSidebar", () => {
  setTimeout(() => _injectSidebarButton(), 100);
});

function _injectSidebarButton() {
  // v13 uses #sidebar-tabs with nav.tabs inside
  const selectors = [
    "#sidebar-tabs",
    "nav.tabs[id='sidebar-tabs']",
    "#sidebar nav.tabs",
    ".sidebar-tabs",
    "nav[data-application-part='tabs']"
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;
    if (el.querySelector("[data-npcforge]")) return;

    const btn = document.createElement("button");
    btn.dataset.npcforge = "1";
    btn.title = "NPC Forge – Jen's easy NPC";
    btn.setAttribute("aria-label", "NPC Forge");
    btn.setAttribute("type", "button");
    btn.className = "ui-control plain icon fa-solid fa-user-plus";
    btn.setAttribute("data-action", "tab");
    btn.setAttribute("data-tab", "npc-forge");
    btn.setAttribute("role", "tab");
    btn.style.cssText = "cursor:pointer;";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const panel = getPanel();
      panel.rendered ? panel.close() : panel.render(true);
    });

    el.appendChild(btn);
    console.log("NPC Forge | Button injected into", sel);
    return;
  }

  // Fallback: inject into the menu inside sidebar-tabs
  const menu = document.querySelector("#sidebar-tabs menu, #sidebar-tabs .flexcol");
  if (menu && !menu.querySelector("[data-npcforge]")) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.dataset.npcforge = "1";
    btn.title = "NPC Forge";
    btn.type = "button";
    btn.className = "ui-control plain icon fa-solid fa-user-plus";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const panel = getPanel();
      panel.rendered ? panel.close() : panel.render(true);
    });
    li.appendChild(btn);
    menu.appendChild(li);
    console.log("NPC Forge | Button injected via fallback menu");
  }
}

window.NpcForge = {
  open: () => getPanel().render(true),
  panel: getPanel
};
