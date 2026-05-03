// sidebar-panel.js – NPC Forge sidebar panel (Foundry v13 compatible)

import { getRaceDatabase, getClassDatabase, saveRaceDatabase, saveClassDatabase, getSetting } from "./settings.js";
import { extractRaceFromText, extractRaceFromImageBase64, generateNPC, buildPortraitPrompt } from "./claude-api.js";
import { generatePortrait, savePortraitToFoundry } from "./image-gen.js";
import { createNPCActor } from "./actor-creator.js";
import { searchFoundryContent, getBackgrounds } from "./foundry-browser.js";

export class NpcForgeSidebar extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "npc-forge-sidebar",
      title: "NPC Forge",
      template: "modules/npc-forge/templates/sidebar.html",
      width: 340,
      height: 720,
      resizable: true,
      classes: ["npc-forge-app"]
    });
  }

  _activeTab = "create";
  _searchTimers = {};
  _npcParams = {};
  _status = { text: "", type: "" };

  getData() {
    return {
      races: getRaceDatabase(),
      classes: getClassDatabase(),
      activeTab: this._activeTab,
      status: this._status
    };
  }

  // v13: render returns element, not jQuery
  async _renderHTML(context, options) {
    // Use v13 renderTemplate API
    const html = await foundry.applications.handlebars.renderTemplate(
      this.options.template, context
    );
    return html;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // v13: html might be HTMLElement or jQuery – normalize to querySelector
    const root = html instanceof HTMLElement ? html : html[0];

    // Tab switching
    root.querySelectorAll(".npcforge-tab").forEach(tab => {
      tab.addEventListener("click", e => {
        this._activeTab = e.currentTarget.dataset.tab;
        root.querySelectorAll(".npcforge-tab").forEach(t => t.classList.remove("active"));
        root.querySelectorAll(".npcforge-panel").forEach(p => p.classList.remove("active"));
        e.currentTarget.classList.add("active");
        root.querySelector(`.npcforge-panel[data-tab="${this._activeTab}"]`)?.classList.add("active");
      });
    });

    // Wealth chips
    root.querySelectorAll(".npcforge-chip[data-group='wealth']").forEach(chip => {
      chip.addEventListener("click", e => {
        root.querySelectorAll(".npcforge-chip[data-group='wealth']").forEach(c => c.classList.remove("selected"));
        e.currentTarget.classList.add("selected");
        this._npcParams.wealth = e.currentTarget.dataset.value;
      });
    });

    // Age chips
    root.querySelectorAll(".npcforge-chip[data-group='age']").forEach(chip => {
      chip.addEventListener("click", e => {
        root.querySelectorAll(".npcforge-chip[data-group='age']").forEach(c => c.classList.remove("selected"));
        e.currentTarget.classList.add("selected");
        this._npcParams.age = e.currentTarget.dataset.value;
      });
    });

    // Gender chips
    root.querySelectorAll(".npcforge-chip[data-group='gender']").forEach(chip => {
      chip.addEventListener("click", e => {
        root.querySelectorAll(".npcforge-chip[data-group='gender']").forEach(c => c.classList.remove("selected"));
        e.currentTarget.classList.add("selected");
        this._npcParams.gender = e.currentTarget.dataset.value;
      });
    });

    // Search fields
    this._setupSearch(root, "race-search", "race-results", async (q) => {
      const races = getRaceDatabase().filter(r => r.name.toLowerCase().includes(q.toLowerCase()));
      if (!races.length) return `<div class="npcforge-no-results">No races found</div>`;
      return races.map(r => `<div class="npcforge-result-item" data-id="${r.id}" data-type="race">
        <span class="item-name">${r.name}</span><span class="item-source">${r.source ?? ""}</span>
      </div>`).join("");
    });

    this._setupSearch(root, "class-search", "class-results", async (q) => {
      const classes = getClassDatabase().filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
      if (!classes.length) return `<div class="npcforge-no-results">No classes found</div>`;
      return classes.map(c => `<div class="npcforge-result-item" data-id="${c.id}" data-type="class">
        <span class="item-name">${c.name}</span>
      </div>`).join("");
    });

    this._setupSearch(root, "bg-search", "bg-results", async (q) => {
      if (q.length < 1) return "";
      const results = await getBackgrounds(q);
      if (!results.length) return `<div class="npcforge-no-results">No backgrounds found</div>`;
      return results.map(r => `<div class="npcforge-result-item" data-name="${r.name}" data-type="background">
        <span class="item-name">${r.name}</span><span class="item-source">${r.source ?? ""}</span>
      </div>`).join("");
    });

    this._setupSearch(root, "occ-search", "occ-results", async (q) => {
      const common = ["Blacksmith","Innkeeper","Guard","Merchant","Farmer","Apothecary",
        "Scholar","Sailor","Thief","Priest","Hunter","Herbalist","Cook","Cartographer","Scribe"
      ].filter(o => o.toLowerCase().includes(q.toLowerCase()));
      return common.map(o => `<div class="npcforge-result-item" data-name="${o}" data-type="occupation">
        <span class="item-name">${o}</span><span class="item-source">Common</span>
      </div>`).join("") || `<div class="npcforge-no-results">Type to search...</div>`;
    });

    // Result item clicks
    root.addEventListener("click", e => {
      const item = e.target.closest(".npcforge-result-item");
      if (!item) return;
      const type = item.dataset.type;
      const name = item.dataset.name ?? item.querySelector(".item-name")?.textContent;
      this._selectParam(root, type, name, item.dataset.id);
    });

    // Generate button
    root.querySelector(".npcforge-generate-btn")?.addEventListener("click", () => this._generateNPC(root));

    // Drop zone
    const dropzone = root.querySelector(".npcforge-dropzone");
    if (dropzone) {
      dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("drag-over"); });
      dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
      dropzone.addEventListener("drop", e => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
        this._handleFileDrop(e.dataTransfer.files, root);
      });
      dropzone.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = ".pdf,.txt,.png,.jpg,.jpeg,.webp";
        input.onchange = () => this._handleFileDrop(input.files, root);
        input.click();
      });
    }

    // Text import buttons
    root.querySelector(".npcforge-import-text-btn")?.addEventListener("click", () => {
      const text = root.querySelector(".npcforge-import-textarea")?.value;
      if (text?.trim()) this._importFromText(text.trim(), "race", root);
    });

    root.querySelector(".npcforge-import-class-btn")?.addEventListener("click", () => {
      const text = root.querySelector(".npcforge-class-textarea")?.value;
      if (text?.trim()) this._importFromText(text.trim(), "class", root);
    });

    // Delete entry buttons
    root.addEventListener("click", async e => {
      const del = e.target.closest(".npcforge-entry-delete");
      if (!del) return;
      e.stopPropagation();
      const id = del.closest(".npcforge-entry")?.dataset.id;
      if (id) {
        const db = getRaceDatabase().filter(r => r.id !== id);
        await saveRaceDatabase(db);
        this.render();
      }
    });

    // Settings save
    root.querySelector(".npcforge-save-settings")?.addEventListener("click", async () => {
      const anthropicKey = root.querySelector("[name='anthropicKey']")?.value;
      const imageProvider = root.querySelector("[name='imageProvider']")?.value;
      const imageKey = root.querySelector("[name='imageApiKey']")?.value;
      if (anthropicKey) await game.settings.set("npc-forge", "anthropicKey", anthropicKey);
      if (imageProvider) await game.settings.set("npc-forge", "imageProvider", imageProvider);
      if (imageKey) await game.settings.set("npc-forge", "imageApiKey", imageKey);
      ui.notifications.info("NPC Forge: Settings saved!");
    });
  }

  _setupSearch(root, inputId, resultsId, fetchFn) {
    const input = root.querySelector(`#${inputId}`);
    const results = root.querySelector(`#${resultsId}`);
    if (!input || !results) return;

    input.addEventListener("input", () => {
      clearTimeout(this._searchTimers[inputId]);
      this._searchTimers[inputId] = setTimeout(async () => {
        const q = input.value.trim();
        if (q.length < 1) { results.style.display = "none"; results.innerHTML = ""; return; }
        results.innerHTML = await fetchFn(q);
        results.style.display = "block";
      }, 200);
    });

    input.addEventListener("blur", () => {
      setTimeout(() => { results.style.display = "none"; }, 200);
    });
  }

  _selectParam(root, type, name, id) {
    if (type === "race") {
      this._npcParams.raceId = id;
      this._npcParams.raceName = name;
      const inp = root.querySelector("#race-search");
      if (inp) inp.value = name;
      root.querySelector("#race-results").style.display = "none";
    } else if (type === "class") {
      this._npcParams.classId = id;
      this._npcParams.className = name;
      const inp = root.querySelector("#class-search");
      if (inp) inp.value = name;
      root.querySelector("#class-results").style.display = "none";
    } else if (type === "background") {
      this._npcParams.background = name;
      const inp = root.querySelector("#bg-search");
      if (inp) inp.value = name;
      root.querySelector("#bg-results").style.display = "none";
    } else if (type === "occupation") {
      this._npcParams.occupation = name;
      const inp = root.querySelector("#occ-search");
      if (inp) inp.value = name;
      root.querySelector("#occ-results").style.display = "none";
    }
  }

  async _handleFileDrop(files, root) {
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (["png","jpg","jpeg","webp"].includes(ext)) {
        await this._importFromImage(file, root);
      } else if (ext === "pdf") {
        await this._importFromPDF(file, root);
      } else if (ext === "txt") {
        const text = await file.text();
        await this._importFromText(text, "race", root);
      }
    }
  }

  async _importFromImage(file, root) {
    this._setStatus(root, "Analysing image with Claude...", "running");
    try {
      const b64 = await fileToBase64(file);
      const card = await extractRaceFromImageBase64(b64, file.type || "image/png");
      await this._saveCard(card, "race", root);
    } catch(e) {
      this._setStatus(root, `Error: ${e.message}`, "error");
    }
  }

  async _importFromPDF(file, root) {
    this._setStatus(root, "Reading PDF...", "running");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = globalThis.pdfjsLib;
      if (!pdfjsLib) throw new Error("PDF.js not available. Please paste text instead.");
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(s => s.str).join(" ") + "\n";
      }
      await this._importFromText(fullText, "race", root);
    } catch(e) {
      this._setStatus(root, `PDF error: ${e.message}`, "error");
    }
  }

  async _importFromText(text, type, root) {
    this._setStatus(root, "Analysing with Claude...", "running");
    try {
      const card = await extractRaceFromText(text);
      await this._saveCard(card, type, root);
    } catch(e) {
      this._setStatus(root, `Error: ${e.message}`, "error");
    }
  }

  async _saveCard(card, type, root) {
    card.id = foundry.utils.randomID();
    card.isHomebrew = true;
    if (type === "race") {
      const db = getRaceDatabase();
      db.push(card);
      await saveRaceDatabase(db);
      this._setStatus(root, `Race "${card.name}" imported!`, "success");
    } else {
      const db = getClassDatabase();
      db.push(card);
      await saveClassDatabase(db);
      this._setStatus(root, `Class "${card.name}" imported!`, "success");
    }
    this.render();
  }

  async _generateNPC(root) {
    const btn = root.querySelector(".npcforge-generate-btn");
    if (btn) btn.disabled = true;

    try {
      const raceId = this._npcParams.raceId;
      const raceCard = raceId ? getRaceDatabase().find(r => r.id === raceId) : null;
      const specialWish = root.querySelector("#special-wish")?.value.trim() || null;
      const availableItems = game.items.map(i => i.name).slice(0, 100);

      const params = {
        race: raceCard,
        raceClass: this._npcParams.className ?? null,
        occupation: this._npcParams.occupation ?? null,
        background: this._npcParams.background ?? null,
        gender: this._npcParams.gender ?? null,
        age: this._npcParams.age ?? "normal",
        wealth: this._npcParams.wealth ?? "normal",
        specialWish,
        availableItems
      };

      this._setStatus(root, "Step 1/3: Generating NPC with Claude...", "running");
      const npcData = await generateNPC(params);

      this._setStatus(root, "Step 2/3: Generating portrait...", "running");
      const prompt = buildPortraitPrompt(npcData, raceCard);
      const imageDataUrl = await generatePortrait(prompt);

      this._setStatus(root, "Step 3/3: Creating Foundry Actor...", "running");
      const portraitPath = await savePortraitToFoundry(imageDataUrl, npcData.name);
      await createNPCActor(npcData, portraitPath);

      this._setStatus(root, `Done! "${npcData.name}" created.`, "success");
    } catch(e) {
      console.error("NPC Forge error:", e);
      this._setStatus(root, `Error: ${e.message}`, "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  _setStatus(root, text, type) {
    const el = root.querySelector(".npcforge-status");
    if (!el) return;
    el.textContent = text;
    el.className = `npcforge-status ${type}`;
    el.style.display = "block";
  }
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
