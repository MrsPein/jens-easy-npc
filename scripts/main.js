// main.js – NPC Forge entry point (Foundry v13)

import { registerSettings } from "./settings.js";
import { NpcForgeSidebar } from "./sidebar-panel.js";

// Module-level singleton
let _panel = null;

function getPanel() {
  if (!_panel) _panel = new NpcForgeSidebar();
  return _panel;
}

// ── Init ──────────────────────────────────────────────────────────────────

Hooks.once("init", () => {
  console.log("NPC Forge | Initialising...");
  registerSettings();

  // Register Handlebars helper for tab active state
  Handlebars.registerHelper("eq", (a, b) => a === b);
});

Hooks.once("ready", () => {
  console.log("NPC Forge | Ready.");
});

// ── Sidebar Button (v13 API) ──────────────────────────────────────────────

Hooks.on("renderSidebar", (_sidebar, html) => {
  // Add NPC Forge button to the Foundry sidebar tab strip
  const tabsEl = html[0]?.querySelector?.(".tabs") ?? html.find?.(".tabs")?.[0];
  if (!tabsEl) return;

  // Avoid duplicate buttons
  if (tabsEl.querySelector("[data-tab='npc-forge']")) return;

  const btn = document.createElement("a");
  btn.classList.add("item");
  btn.dataset.tab = "npc-forge";
  btn.dataset.tooltip = "NPC Forge";
  btn.setAttribute("aria-label", "NPC Forge");
  btn.innerHTML = `<i class="fas fa-user-plus"></i>`;
  btn.style.cssText = "position:relative";

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const panel = getPanel();
    if (panel.rendered) {
      panel.close();
    } else {
      panel.render(true);
    }
  });

  tabsEl.appendChild(btn);
});

// Alternative hook for v13 where sidebar renders differently
Hooks.on("renderSceneNavigation", () => _injectSidebarButton());
Hooks.on("changeSidebarTab", () => _injectSidebarButton());

function _injectSidebarButton() {
  // Try multiple selectors for v13 compatibility
  const selectors = [
    "#sidebar .tabs",
    "#sidebar-tabs",
    ".sidebar-tabs"
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el || el.querySelector("[data-npcforge]")) continue;

    const btn = document.createElement("a");
    btn.dataset.npcforge = "1";
    btn.title = "NPC Forge";
    btn.style.cssText = "cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px 8px;";
    btn.innerHTML = `<i class="fas fa-user-plus"></i>`;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const panel = getPanel();
      panel.rendered ? panel.close() : panel.render(true);
    });

    el.appendChild(btn);
    break;
  }
}

// ── Export for macro access ───────────────────────────────────────────────
window.NpcForge = {
  open: () => getPanel().render(true),
  panel: getPanel
};
