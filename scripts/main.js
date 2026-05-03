// main.js – NPC Forge (Foundry v13)

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
  setTimeout(() => _injectButton(), 1000);
});

Hooks.on("renderSceneControls", () => {
  setTimeout(() => _injectButton(), 200);
});

Hooks.on("renderSidebar", () => {
  setTimeout(() => _injectButton(), 200);
});

function _injectButton() {
  // Already injected?
  if (document.querySelector("[data-npcforge]")) return;

  // Try left scene controls first (preferred location)
  const leftMenu = document.querySelector("#scene-controls-layers menu, #scene-controls menu.flexcol");
  if (leftMenu) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.dataset.npcforge = "1";
    btn.type = "button";
    btn.className = "control ui-control layer icon fa-solid fa-user-plus";
    btn.setAttribute("data-tooltip", "NPC Forge – Jen's easy NPC");
    btn.title = "NPC Forge";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const panel = getPanel();
      panel.rendered ? panel.close() : panel.render(true);
    });
    li.appendChild(btn);
    leftMenu.appendChild(li);
    console.log("NPC Forge | Button injected into left scene controls");
    return;
  }

  // Fallback: right sidebar
  const rightMenu = document.querySelector("#sidebar-tabs menu");
  if (rightMenu) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.dataset.npcforge = "1";
    btn.type = "button";
    btn.className = "ui-control plain icon fa-solid fa-user-plus";
    btn.title = "NPC Forge";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const panel = getPanel();
      panel.rendered ? panel.close() : panel.render(true);
    });
    li.appendChild(btn);
    rightMenu.appendChild(li);
    console.log("NPC Forge | Button injected into right sidebar");
  }
}

window.NpcForge = {
  open: () => getPanel().render(true),
  panel: getPanel
};
