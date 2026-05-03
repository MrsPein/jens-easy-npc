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
  setTimeout(() => _injectButton(), 1500);
});

Hooks.on("renderSceneControls", () => {
  setTimeout(() => _injectButton(), 300);
});

function _injectButton() {
  if (document.querySelector("[data-npcforge]")) return;

  const menu = document.querySelector("#scene-controls menu");
  if (!menu) {
    console.warn("NPC Forge | #scene-controls menu not found, retrying...");
    setTimeout(() => _injectButton(), 1000);
    return;
  }

  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.dataset.npcforge = "1";
  btn.type = "button";
  btn.className = "control ui-control layer icon fa-solid fa-user-plus";
  btn.title = "NPC Forge – Jen's easy NPC";
  btn.setAttribute("data-tooltip", "NPC Forge");
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const panel = getPanel();
    panel.rendered ? panel.close() : panel.render(true);
  });
  li.appendChild(btn);
  menu.appendChild(li);
  console.log("NPC Forge | Button injected into scene controls!");
}

window.NpcForge = {
  open: () => getPanel().render(true),
  panel: getPanel
};
