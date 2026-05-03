// sidebar-panel.js – NPC Forge sidebar panel (Foundry v13)

import { getRaceDatabase, getClassDatabase, saveRaceDatabase, saveClassDatabase, getSetting } from "./settings.js";
import { extractRaceFromText, extractRaceFromImageBase64, generateNPC, buildPortraitPrompt } from "./claude-api.js";
import { generatePortrait, savePortraitToFoundry } from "./image-gen.js";
import { createNPCActor } from "./actor-creator.js";
import { searchFoundryContent, getBackgrounds } from "./foundry-browser.js";

export class NpcForgeSidebar extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "npc-forge-sidebar",
      title: "NPC Forge",
      template: "modules/npc-forge/templates/sidebar.html",
      width: 320,
      height: 700,
      resizable: true,
      classes: ["npc-forge-app"]
    });
  }

  // Active tab state
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

  activateListeners(html) {
    super.activateListeners(html);

    // Tab switching
    html.find(".npcforge-tab").on("click", e => {
      this._activeTab = e.currentTarget.dataset.tab;
      html.find(".npcforge-tab").removeClass("active");
      html.find(".npcforge-panel").removeClass("active");
      e.currentTarget.classList.add("active");
      html.find(`.npcforge-panel[data-tab="${this._activeTab}"]`).addClass("active");
    });

    // ── CREATE TAB ──────────────────────────────────────────────────────────

    // Wealth chips
    html.find(".npcforge-chip[data-group='wealth']").on("click", e => {
      html.find(".npcforge-chip[data-group='wealth']").removeClass("selected");
      e.currentTarget.classList.add("selected");
      this._npcParams.wealth = e.currentTarget.dataset.value;
    });

    // Age chips
    html.find(".npcforge-chip[data-group='age']").on("click", e => {
      html.find(".npcforge-chip[data-group='age']").removeClass("selected");
      e.currentTarget.classList.add("selected");
      this._npcParams.age = e.currentTarget.dataset.value;
    });

    // Gender chips
    html.find(".npcforge-chip[data-group='gender']").on("click", e => {
      html.find(".npcforge-chip[data-group='gender']").removeClass("selected");
      e.currentTarget.classList.add("selected");
      this._npcParams.gender = e.currentTarget.dataset.value;
    });

    // Race search
    this._setupSearch(html, "race-search", "race-results", async (q) => {
      const races = getRaceDatabase().filter(r =>
        r.name.toLowerCase().includes(q.toLowerCase())
      );
      return races.map(r => `<div class="npcforge-result-item" data-id="${r.id}" data-type="race">
        <span class="item-name">${r.name}</span>
        <span class="item-source">${r.source ?? ""}</span>
      </div>`).join("") || "<div class='npcforge-no-results'>No races found</div>";
    });

    // Class search
    this._setupSearch(html, "class-search", "class-results", async (q) => {
      const classes = getClassDatabase().filter(c =>
        c.name.toLowerCase().includes(q.toLowerCase())
      );
      return classes.map(c => `<div class="npcforge-result-item" data-id="${c.id}" data-type="class">
        <span class="item-name">${c.name}</span>
      </div>`).join("") || "<div class='npcforge-no-results'>No classes found</div>";
    });

    // Background search (from Foundry folders)
    this._setupSearch(html, "bg-search", "bg-results", async (q) => {
      if (q.length < 1) return "";
      const results = await getBackgrounds(q);
      return results.map(r => `<div class="npcforge-result-item" data-name="${r.name}" data-type="background">
        <span class="item-name">${r.name}</span>
        <span class="item-source">${r.source ?? ""}</span>
      </div>`).join("") || "<div class='npcforge-no-results'>No backgrounds found</div>";
    });

    // Occupation search (Foundry items + freetext)
    this._setupSearch(html, "occ-search", "occ-results", async (q) => {
      const results = await searchFoundryContent(q, [], 20);
      const common = ["Blacksmith", "Innkeeper", "Guard", "Merchant", "Farmer",
        "Apothecary", "Scholar", "Sailor", "Thief", "Priest",
        "Hunter", "Herbalist", "Cook", "Cartographer", "Scribe"
      ].filter(o => o.toLowerCase().includes(q.toLowerCase()));

      const items = results.map(r => `<div class="npcforge-result-item" data-name="${r.name}" data-type="occupation">
        <span class="item-name">${r.name}</span><span class="item-source">${r.source ?? ""}</span>
      </div>`);
      const commons = common.map(o => `<div class="npcforge-result-item" data-name="${o}" data-type="occupation">
        <span class="item-name">${o}</span><span class="item-source">Common</span>
      </div>`);

      return [...new Set([...commons, ...items])].slice(0, 20).join("") || "";
    });

    // Result item clicks – select into params
    html.on("click", ".npcforge-result-item", e => {
      const el = e.currentTarget;
      const type = el.dataset.type;
      const name = el.dataset.name ?? el.querySelector(".item-name")?.textContent;
      this._selectParam(html, type, name, el.dataset.id);
    });

    // Generate button
    html.find(".npcforge-generate-btn").on("click", () => this._generateNPC(html));

    // ── RACES TAB ───────────────────────────────────────────────────────────

    // Drop zone
    const dropzone = html.find(".npcforge-dropzone")[0];
    if (dropzone) {
      dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("drag-over"); });
      dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
      dropzone.addEventListener("drop", e => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
        this._handleFileDrop(e.dataTransfer.files, html);
      });
      dropzone.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = ".pdf,.txt,.png,.jpg,.jpeg,.webp";
        input.onchange = () => this._handleFileDrop(input.files, html);
        input.click();
      });
    }

    // Text import
    html.find(".npcforge-import-text-btn").on("click", () => {
      const text = html.find(".npcforge-import-textarea").val();
      if (text?.trim()) this._importFromText(text.trim(), "race", html);
    });

    // Delete race entry
    html.on("click", ".npcforge-entry-delete", async e => {
      e.stopPropagation();
      const id = e.currentTarget.closest(".npcforge-entry").dataset.id;
      const db = getRaceDatabase().filter(r => r.id !== id);
      await saveRaceDatabase(db);
      this.render();
    });

    // ── CLASSES TAB ─────────────────────────────────────────────────────────

    html.find(".npcforge-import-class-btn").on("click", () => {
      const text = html.find(".npcforge-class-textarea").val();
      if (text?.trim()) this._importFromText(text.trim(), "class", html);
    });

    // ── SETTINGS TAB ────────────────────────────────────────────────────────

    html.find(".npcforge-save-settings").on("click", async () => {
      const anthropicKey = html.find("[name='anthropicKey']").val();
      const imageProvider = html.find("[name='imageProvider']").val();
      const imageKey = html.find("[name='imageApiKey']").val();
      await game.settings.set("npc-forge", "anthropicKey", anthropicKey);
      await game.settings.set("npc-forge", "imageProvider", imageProvider);
      await game.settings.set("npc-forge", "imageApiKey", imageKey);
      ui.notifications.info("NPC Forge: Settings saved.");
    });
  }

  // ── Search helper ─────────────────────────────────────────────────────────

  _setupSearch(html, inputId, resultsId, fetchFn) {
    const input = html.find(`#${inputId}`);
    const results = html.find(`#${resultsId}`);
    input.on("input", () => {
      clearTimeout(this._searchTimers[inputId]);
      this._searchTimers[inputId] = setTimeout(async () => {
        const q = input.val().trim();
        if (q.length < 1) { results.hide().html(""); return; }
        const html2 = await fetchFn(q);
        results.html(html2).show();
      }, 200);
    });
    input.on("blur", () => setTimeout(() => results.hide(), 200));
  }

  _selectParam(html, type, name, id) {
    if (type === "race") {
      this._npcParams.raceId = id;
      this._npcParams.raceName = name;
      html.find("#race-search").val(name);
      html.find("#race-results").hide();
    } else if (type === "class") {
      this._npcParams.classId = id;
      this._npcParams.className = name;
      html.find("#class-search").val(name);
      html.find("#class-results").hide();
    } else if (type === "background") {
      this._npcParams.background = name;
      html.find("#bg-search").val(name);
      html.find("#bg-results").hide();
    } else if (type === "occupation") {
      this._npcParams.occupation = name;
      html.find("#occ-search").val(name);
      html.find("#occ-results").hide();
    }
  }

  // ── Import ────────────────────────────────────────────────────────────────

  async _handleFileDrop(files, html) {
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
        await this._importFromImage(file, html);
      } else if (ext === "pdf") {
        await this._importFromPDF(file, html);
      } else if (ext === "txt") {
        const text = await file.text();
        await this._importFromText(text, "race", html);
      }
    }
  }

  async _importFromImage(file, html) {
    this._setStatus(html, "Analysing image with Claude...", "running");
    try {
      const b64 = await fileToBase64(file);
      const mimeType = file.type || "image/png";
      const card = await extractRaceFromImageBase64(b64, mimeType);
      await this._showCardPreview(card, "race", html);
    } catch(e) {
      this._setStatus(html, `Error: ${e.message}`, "error");
    }
  }

  async _importFromPDF(file, html) {
    this._setStatus(html, "Reading PDF...", "running");
    try {
      // Use PDF.js (bundled with Foundry) to extract text
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = globalThis.pdfjsLib ?? await import("/scripts/pdfjs/pdf.min.js");
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(s => s.str).join(" ") + "\n";
      }
      await this._importFromText(fullText, "race", html);
    } catch(e) {
      this._setStatus(html, `PDF error: ${e.message}`, "error");
    }
  }

  async _importFromText(text, type, html) {
    this._setStatus(html, `Analysing with Claude...`, "running");
    try {
      const { extractRaceFromText } = await import("./claude-api.js");
      const card = await extractRaceFromText(text);
      await this._showCardPreview(card, type, html);
    } catch(e) {
      this._setStatus(html, `Error: ${e.message}`, "error");
    }
  }

  async _showCardPreview(card, type, html) {
    // Save to database
    card.id = randomID();
    card.isHomebrew = true;

    if (type === "race") {
      const db = getRaceDatabase();
      db.push(card);
      await saveRaceDatabase(db);
      this._setStatus(html, `Race "${card.name}" imported!`, "success");
    } else {
      const db = getClassDatabase();
      db.push(card);
      await saveClassDatabase(db);
      this._setStatus(html, `Class "${card.name}" imported!`, "success");
    }
    this.render();
  }

  // ── NPC Generation ────────────────────────────────────────────────────────

  async _generateNPC(html) {
    const btn = html.find(".npcforge-generate-btn");
    btn.prop("disabled", true);

    try {
      // Gather all params
      const raceId = this._npcParams.raceId;
      const raceCard = raceId
        ? getRaceDatabase().find(r => r.id === raceId)
        : null;

      const specialWish = html.find("#special-wish").val().trim() || null;

      // Collect available Foundry item names for Claude to use
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

      // Step 1: Generate NPC data
      this._setStatus(html, "Step 1/3: Generating NPC with Claude...", "running");
      const npcData = await generateNPC(params);

      // Step 2: Generate portrait
      this._setStatus(html, "Step 2/3: Generating portrait...", "running");
      const prompt = buildPortraitPrompt(npcData, raceCard);
      const imageDataUrl = await generatePortrait(prompt);

      // Step 3: Save image + create actor
      this._setStatus(html, "Step 3/3: Creating Foundry Actor...", "running");
      const portraitPath = await savePortraitToFoundry(imageDataUrl, npcData.name);
      await createNPCActor(npcData, portraitPath);

      this._setStatus(html, `Done! "${npcData.name}" created.`, "success");

    } catch(e) {
      console.error("NPC Forge error:", e);
      this._setStatus(html, `Error: ${e.message}`, "error");
    } finally {
      btn.prop("disabled", false);
    }
  }

  _setStatus(html, text, type) {
    const el = html.find(".npcforge-status");
    el.text(text).attr("class", `npcforge-status ${type}`).show();
  }
}

// ── Utility ───────────────────────────────────────────────────────────────

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
