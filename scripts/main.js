// NPC Forge - main entry point

Hooks.once("ready", () => {
  console.log("NPC Forge | Ready - injecting button...");
  setTimeout(() => NpcForge._injectButton(), 1500);
});

Hooks.on("renderSceneControls", () => {
  setTimeout(() => NpcForge._injectButton(), 300);
});

window.NpcForge = {
  _panel: null,
  open() {
    if (!this._panel) this._panel = new NpcForgePanel();
    if (this._panel.rendered) this._panel.close();
    else this._panel.render(true);
  },
  _injectButton() {
    if (document.querySelector("[data-npcforge-btn]")) return;
    const menu = document.querySelector("#scene-controls menu") || document.querySelector("#sidebar-tabs menu");
    if (!menu) { setTimeout(() => NpcForge._injectButton(), 1000); return; }
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.setAttribute("data-npcforge-btn", "1");
    btn.type = "button";
    btn.className = "control ui-control layer icon fa-solid fa-user-plus";
    btn.title = "NPC Forge – Jen's easy NPC";
    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); NpcForge.open(); });
    li.appendChild(btn);
    menu.appendChild(li);
    console.log("NPC Forge | Button injected!");
  }
};

// ── i18n helper ──────────────────────────────────────────────────────────────
const NF_I18N = {
  de: {
    tabCreate: "Erstellen", tabRaces: "Rassen", tabClasses: "Klassen", tabSettings: "Einstellungen",
    labelRace: "Rasse", labelBackground: "Hintergrund", labelGender: "Geschlecht",
    labelAge: "Alter", labelWealth: "Wohlstand", labelWish: "Besonderer Wunsch",
    wishPlaceholder: "z.B. ist Apothekerin, hat blaue Haare, trägt goldene Ohrringe, hat eine große Narbe über dem Auge...",
    gRandom: "Zufällig", gMale: "Männlich", gFemale: "Weiblich", gNonBinary: "Divers",
    aYoung: "Jung", aNormal: "Normal", aOld: "Alt",
    wPoor: "Arm", wModest: "Bescheiden", wNormal: "Normal", wWealthy: "Wohlhabend", wNoble: "Adelig",
    btnGenerate: "NPC Generieren",
    labelAnthropicKey: "Anthropic / OpenRouter API-Schlüssel",
    labelSaveSettings: "Einstellungen speichern",
    settingsSaved: "Einstellungen gespeichert!",
    step1: "Schritt 1/2: NPC wird generiert...",
    step2: "Schritt 2/2: Erstelle Charakter...",
    done: (name) => `✓ "${name}" erstellt!`,
    searchRace: "Rasse suchen...", searchBg: "Hintergrund suchen...",
    noRaces: "Keine Rassen gefunden", noResults: "Keine Ergebnisse",
    pasteRace: "Oder Text / Beschreibung einfügen",
    importFromText: "Aus Text importieren", importClass: "Klasse importieren",
    pasteClass: "Klassenbeschreibung einfügen",
    savedRaces: (n) => `Gespeicherte Rassen (${n})`,
    noRacesYet: "Noch keine Rassen. Oben Text importieren.",
    optional: "optional",
    outputLang: "Deutsch",
  },
  en: {
    tabCreate: "Create", tabRaces: "Races", tabClasses: "Classes", tabSettings: "Settings",
    labelRace: "Race", labelBackground: "Background", labelGender: "Gender",
    labelAge: "Age", labelWealth: "Wealth", labelWish: "Special Personal Wish",
    wishPlaceholder: "e.g. is an apothecary, has blue hair, wears golden earrings, has a big scar over one eye, missing an ear...",
    gRandom: "Random", gMale: "Male", gFemale: "Female", gNonBinary: "Non-binary",
    aYoung: "Young", aNormal: "Normal", aOld: "Old",
    wPoor: "Poor", wModest: "Modest", wNormal: "Normal", wWealthy: "Wealthy", wNoble: "Noble",
    btnGenerate: "Generate NPC",
    labelAnthropicKey: "Anthropic / OpenRouter API Key",
    labelSaveSettings: "Save Settings",
    settingsSaved: "Settings saved!",
    step1: "Step 1/2: Generating NPC...",
    step2: "Step 2/2: Creating actor...",
    done: (name) => `✓ "${name}" created!`,
    searchRace: "Search races...", searchBg: "Search backgrounds...",
    noRaces: "No races found", noResults: "No results",
    pasteRace: "Or paste text / description",
    importFromText: "Import from text", importClass: "Import class",
    pasteClass: "Paste class or subclass...",
    savedRaces: (n) => `Saved races (${n})`,
    noRacesYet: "No races yet. Import from text above.",
    optional: "optional",
    outputLang: "English",
  }
};

function getNFLang() {
  try {
    const lang = game.settings.get("core", "language") || "en";
    return lang.startsWith("de") ? "de" : "en";
  } catch(e) { return "en"; }
}

function t(key, ...args) {
  const lang = getNFLang();
  const dict = NF_I18N[lang] || NF_I18N.en;
  const val = dict[key] || NF_I18N.en[key] || key;
  return typeof val === "function" ? val(...args) : val;
}

// ── Settings ──────────────────────────────────────────────────────────────────
Hooks.once("init", () => {
  console.log("NPC Forge | Initialising...");
  game.settings.register("npc-forge", "anthropicKey", {
    name: "Anthropic / OpenRouter API Key", scope: "world", config: true, type: String, default: ""
  });
  game.settings.register("npc-forge", "raceDatabase", { scope: "world", config: false, type: String, default: "[]" });
  game.settings.register("npc-forge", "classDatabase", { scope: "world", config: false, type: String, default: "[]" });
  Handlebars.registerHelper("eq", (a, b) => a === b);
});

// ── Panel ─────────────────────────────────────────────────────────────────────
class NpcForgePanel extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "npc-forge-sidebar", title: "Jen's easy NPC",
      template: "modules/npc-forge/templates/sidebar.html",
      width: 380, height: 720, resizable: true
    });
  }

  _activeTab = "create";
  _npcParams = {};
  _searchTimers = {};

  async _renderInner(data) {
    let races = [];
    try { races = JSON.parse(game.settings.get("npc-forge","raceDatabase")); } catch(e) {}

    const raceList = races.length
      ? races.map(r => `<div class="npcforge-entry" data-id="${r.id}">
          <div class="npcforge-entry-header">
            <span class="npcforge-entry-name">${r.name||"?"}</span>
            <span class="npcforge-entry-source ${r.isHomebrew?'homebrew':''}">${r.source||""}</span>
            <button class="npcforge-entry-delete" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#999;font-size:12px">✕</button>
          </div>
          <div style="font-size:10px;color:#888;margin-top:2px">${r.traits?.size||""} · ${r.traits?.speed?.walk||30}ft · ${r.traits?.alignment||""}</div>
        </div>`).join("")
      : `<div style="text-align:center;color:#888;font-size:11px;padding:12px 0">${t("noRacesYet")}</div>`;

    const html = `<div id="npc-forge-inner">
<style>
#npc-forge-inner { font-family: var(--font-primary); }
.nf-tabs { display:flex; gap:2px; padding:6px 6px 0; border-bottom:1px solid #ccc; }
.nf-tab { flex:1; padding:6px 4px; font-size:11px; text-align:center; cursor:pointer; border-radius:4px 4px 0 0; border:1px solid transparent; border-bottom:none; color:#888; background:transparent; }
.nf-tab.active { background:#fff; border-color:#ccc; color:#333; font-weight:600; }
.nf-panel { display:none; padding:8px; flex-direction:column; gap:6px; }
.nf-panel.active { display:flex; }
.nf-field { display:flex; flex-direction:column; gap:3px; }
.nf-field label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#888; }
.nf-field input, .nf-field textarea, .nf-field select { font-size:12px; padding:4px 6px; border:1px solid #ccc; border-radius:4px; width:100%; box-sizing:border-box; }
.nf-field textarea { resize:vertical; min-height:60px; font-family:inherit; }
.nf-chips { display:flex; gap:4px; flex-wrap:wrap; }
.nf-chip { padding:3px 8px; font-size:11px; border-radius:3px; border:1px solid #ccc; background:#f5f5f5; cursor:pointer; color:#666; }
.nf-chip.selected { background:#6b5acd; border-color:transparent; color:#fff; }
.nf-btn { width:100%; padding:8px; font-size:13px; font-weight:600; background:#6b5acd; color:#fff; border:none; border-radius:5px; cursor:pointer; }
.nf-btn:hover { opacity:0.88; }
.nf-btn:disabled { opacity:0.4; cursor:not-allowed; }
.nf-status { font-size:11px; text-align:center; padding:6px; border-radius:4px; display:none; margin-top:4px; }
.nf-status.running { color:#c8a44a; background:rgba(200,164,74,0.1); display:block; }
.nf-status.success { color:#4caf78; background:rgba(76,175,120,0.1); display:block; }
.nf-status.error { color:#e05252; background:rgba(224,82,82,0.1); display:block; }
.nf-dropzone { border:2px dashed #ccc; border-radius:6px; padding:14px 8px; text-align:center; cursor:pointer; color:#888; font-size:11px; }
.nf-dropzone:hover { border-color:#6b5acd; background:#f9f7ff; }
.nf-results { position:absolute; top:100%; left:0; right:0; z-index:9999; background:#fff; border:1px solid #ccc; border-radius:4px; max-height:180px; overflow-y:auto; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:none; }
.nf-result-item { display:flex; justify-content:space-between; padding:5px 8px; cursor:pointer; font-size:12px; border-bottom:1px solid #eee; }
.nf-result-item:hover { background:#f0f0f0; }
.nf-result-item:last-child { border-bottom:none; }
.nf-sep { font-size:10px; text-transform:uppercase; letter-spacing:0.06em; color:#888; padding-bottom:4px; border-bottom:1px solid #eee; margin-top:4px; }
</style>
<div class="nf-tabs">
  <button class="nf-tab ${this._activeTab==='create'?'active':''}" data-tab="create">${t("tabCreate")}</button>
  <button class="nf-tab ${this._activeTab==='races'?'active':''}" data-tab="races">${t("tabRaces")}</button>
  <button class="nf-tab ${this._activeTab==='classes'?'active':''}" data-tab="classes">${t("tabClasses")}</button>
  <button class="nf-tab ${this._activeTab==='settings'?'active':''}" data-tab="settings">${t("tabSettings")}</button>
</div>

<div class="nf-panel ${this._activeTab==='create'?'active':''}" data-tab="create">
  <div class="nf-field" style="position:relative">
    <label>${t("labelRace")} <span style="font-weight:normal;opacity:0.6">(${t("optional")})</span></label>
    <input type="text" id="nf-race-search" placeholder="${t("searchRace")}" autocomplete="off">
    <div class="nf-results" id="nf-race-results"></div>
  </div>
  <div class="nf-field" style="position:relative">
    <label>${t("labelBackground")} <span style="font-weight:normal;opacity:0.6">(${t("optional")})</span></label>
    <input type="text" id="nf-bg-search" placeholder="${t("searchBg")}" autocomplete="off">
    <div class="nf-results" id="nf-bg-results"></div>
  </div>
  <div class="nf-field">
    <label>${t("labelGender")}</label>
    <div class="nf-chips">
      <span class="nf-chip selected" data-group="gender" data-value="">${t("gRandom")}</span>
      <span class="nf-chip" data-group="gender" data-value="male">${t("gMale")}</span>
      <span class="nf-chip" data-group="gender" data-value="female">${t("gFemale")}</span>
      <span class="nf-chip" data-group="gender" data-value="non-binary">${t("gNonBinary")}</span>
    </div>
  </div>
  <div class="nf-field">
    <label>${t("labelAge")}</label>
    <div class="nf-chips">
      <span class="nf-chip" data-group="age" data-value="young">${t("aYoung")}</span>
      <span class="nf-chip selected" data-group="age" data-value="normal">${t("aNormal")}</span>
      <span class="nf-chip" data-group="age" data-value="old">${t("aOld")}</span>
    </div>
  </div>
  <div class="nf-field">
    <label>${t("labelWealth")}</label>
    <div class="nf-chips">
      <span class="nf-chip" data-group="wealth" data-value="poor">${t("wPoor")}</span>
      <span class="nf-chip" data-group="wealth" data-value="modest">${t("wModest")}</span>
      <span class="nf-chip selected" data-group="wealth" data-value="normal">${t("wNormal")}</span>
      <span class="nf-chip" data-group="wealth" data-value="wealthy">${t("wWealthy")}</span>
      <span class="nf-chip" data-group="wealth" data-value="noble">${t("wNoble")}</span>
    </div>
  </div>
  <div class="nf-field">
    <label>${t("labelWish")} <span style="font-weight:normal;opacity:0.6">(${t("optional")})</span></label>
    <textarea id="nf-special-wish" placeholder="${t("wishPlaceholder")}"></textarea>
  </div>
  <div class="nf-status" id="nf-create-status"></div>
  <button class="nf-btn nf-generate-btn">${t("btnGenerate")}</button>
</div>

<div class="nf-panel ${this._activeTab==='races'?'active':''}" data-tab="races">
  <div class="nf-dropzone" id="nf-dropzone">
    <div style="font-size:20px;margin-bottom:6px;opacity:0.4">⬆</div>
    Drop image or text file here, or click to browse
  </div>
  <div class="nf-field">
    <label>${t("pasteRace")}</label>
    <textarea class="nf-import-textarea" rows="4" placeholder="Paste race description..."></textarea>
    <button class="nf-btn" id="nf-import-text-btn" style="margin-top:4px">${t("importFromText")}</button>
  </div>
  <div class="nf-status" id="nf-races-status"></div>
  <div class="nf-sep">${t("savedRaces", races.length)}</div>
  ${raceList}
</div>

<div class="nf-panel ${this._activeTab==='classes'?'active':''}" data-tab="classes">
  <div class="nf-field">
    <label>${t("pasteClass")}</label>
    <textarea class="nf-class-textarea" rows="4" placeholder="${t("pasteClass")}"></textarea>
    <button class="nf-btn" id="nf-import-class-btn" style="margin-top:4px">${t("importClass")}</button>
  </div>
  <div class="nf-status" id="nf-classes-status"></div>
</div>

<div class="nf-panel ${this._activeTab==='settings'?'active':''}" data-tab="settings">
  <div class="nf-field">
    <label>${t("labelAnthropicKey")}</label>
    <input type="password" id="nf-anthropic-key" placeholder="sk-ant-... or sk-or-...">
    <div style="font-size:10px;color:#888;margin-top:3px">OpenRouter (sk-or-...) oder Anthropic direkt</div>
  </div>
  <button class="nf-btn" id="nf-save-settings" style="margin-top:8px">${t("labelSaveSettings")}</button>
  <div class="nf-status" id="nf-settings-status"></div>
</div>
</div>`;

    const div = document.createElement("div");
    div.innerHTML = html;
    return $(div);
  }

  getData() { return {}; }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html instanceof HTMLElement ? html : html[0];

    root.querySelectorAll(".nf-tab").forEach(tab => {
      tab.addEventListener("click", e => {
        this._activeTab = e.currentTarget.dataset.tab;
        root.querySelectorAll(".nf-tab").forEach(t => t.classList.remove("active"));
        root.querySelectorAll(".nf-panel").forEach(p => p.classList.remove("active"));
        e.currentTarget.classList.add("active");
        root.querySelector(`.nf-panel[data-tab="${this._activeTab}"]`)?.classList.add("active");
      });
    });

    root.querySelectorAll(".nf-chip").forEach(chip => {
      chip.addEventListener("click", e => {
        const group = e.currentTarget.dataset.group;
        root.querySelectorAll(`.nf-chip[data-group="${group}"]`).forEach(c => c.classList.remove("selected"));
        e.currentTarget.classList.add("selected");
        this._npcParams[group] = e.currentTarget.dataset.value;
      });
    });

    this._setupSearch(root, "nf-race-search", "nf-race-results", q => {
      let races = [];
      try { races = JSON.parse(game.settings.get("npc-forge","raceDatabase")); } catch(e) {}
      return races.filter(r => r.name?.toLowerCase().includes(q.toLowerCase()))
        .map(r => `<div class="nf-result-item" data-id="${r.id}" data-type="race"><span>${r.name}</span><span style="color:#888;font-size:10px">${r.source||""}</span></div>`).join("")
        || `<div style="padding:8px;color:#888;font-size:11px;text-align:center">${t("noRaces")}</div>`;
    });

    this._setupSearch(root, "nf-bg-search", "nf-bg-results", async q => {
      const results = [];
      for (const item of game.items) {
        if (item.type==="background" && item.name.toLowerCase().includes(q.toLowerCase()))
          results.push(`<div class="nf-result-item" data-name="${item.name}" data-type="background"><span>${item.name}</span><span style="color:#888;font-size:10px">World</span></div>`);
      }
      for (const pack of game.packs) {
        if (results.length > 20) break;
        try {
          const index = await pack.getIndex();
          for (const e of index) {
            if (e.name.toLowerCase().includes(q.toLowerCase())) {
              results.push(`<div class="nf-result-item" data-name="${e.name}" data-type="background"><span>${e.name}</span><span style="color:#888;font-size:10px">${pack.metadata.label}</span></div>`);
              if (results.length > 20) break;
            }
          }
        } catch(e) {}
      }
      return results.join("") || `<div style="padding:8px;color:#888;font-size:11px;text-align:center">${t("noResults")}</div>`;
    });

    root.addEventListener("click", e => {
      const item = e.target.closest(".nf-result-item");
      if (!item) return;
      const type = item.dataset.type;
      const name = item.dataset.name || item.querySelector("span")?.textContent;
      const id = item.dataset.id;
      if (type==="race") { this._npcParams.raceId=id; this._npcParams.raceName=name; const inp=root.querySelector("#nf-race-search"); if(inp)inp.value=name; root.querySelector("#nf-race-results").style.display="none"; }
      else if (type==="background") { this._npcParams.background=name; const inp=root.querySelector("#nf-bg-search"); if(inp)inp.value=name; root.querySelector("#nf-bg-results").style.display="none"; }
    });

    root.querySelector(".nf-generate-btn")?.addEventListener("click", () => this._generateNPC(root));

    root.querySelector("#nf-import-text-btn")?.addEventListener("click", () => {
      const text = root.querySelector(".nf-import-textarea")?.value?.trim();
      if (text) this._importFromText(text, root);
    });

    root.querySelector("#nf-import-class-btn")?.addEventListener("click", () => {
      const text = root.querySelector(".nf-class-textarea")?.value?.trim();
      if (text) this._importFromText(text, root, "class");
    });

    const dz = root.querySelector("#nf-dropzone");
    if (dz) {
      dz.addEventListener("dragover", e => { e.preventDefault(); dz.style.borderColor="#6b5acd"; });
      dz.addEventListener("dragleave", () => dz.style.borderColor="#ccc");
      dz.addEventListener("drop", e => { e.preventDefault(); dz.style.borderColor="#ccc"; this._handleFiles(e.dataTransfer.files, root); });
      dz.addEventListener("click", () => { const inp=document.createElement("input"); inp.type="file"; inp.multiple=true; inp.accept=".txt,.png,.jpg,.jpeg,.webp"; inp.onchange=()=>this._handleFiles(inp.files,root); inp.click(); });
    }

    root.addEventListener("click", async e => {
      const del = e.target.closest(".npcforge-entry-delete");
      if (!del) return;
      e.stopPropagation();
      const id = del.closest("[data-id]")?.dataset.id;
      if (id) {
        let db = [];
        try { db = JSON.parse(game.settings.get("npc-forge","raceDatabase")); } catch(e) {}
        await game.settings.set("npc-forge","raceDatabase",JSON.stringify(db.filter(r=>r.id!==id)));
        this.render();
      }
    });

    root.querySelector("#nf-save-settings")?.addEventListener("click", async () => {
      const k = root.querySelector("#nf-anthropic-key")?.value;
      if (k) await game.settings.set("npc-forge","anthropicKey",k);
      this._setStatus(root, t("settingsSaved"), "success", "nf-settings-status");
    });

    try {
      const savedKey = game.settings.get("npc-forge","anthropicKey");
      if (savedKey) { const el=root.querySelector("#nf-anthropic-key"); if(el)el.value=savedKey; }
    } catch(e) {}
  }

  _setupSearch(root, inputId, resultsId, fetchFn) {
    const input = root.querySelector(`#${inputId}`);
    const results = root.querySelector(`#${resultsId}`);
    if (!input || !results) return;
    input.addEventListener("input", () => {
      clearTimeout(this._searchTimers[inputId]);
      this._searchTimers[inputId] = setTimeout(async () => {
        const q = input.value.trim();
        if (!q) { results.style.display="none"; return; }
        results.innerHTML = await fetchFn(q);
        results.style.display = "block";
      }, 200);
    });
    input.addEventListener("blur", () => setTimeout(() => results.style.display="none", 200));
  }

  async _handleFiles(files, root) {
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (["png","jpg","jpeg","webp"].includes(ext)) {
        this._setStatus(root, "Analysing image with Claude...", "running");
        try {
          const b64 = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(file); });
          await this._importFromImageB64(b64, file.type || "image/png", root);
        } catch(e) { this._setStatus(root, `Error: ${e.message}`, "error"); }
      } else if (ext === "txt") {
        const text = await file.text();
        await this._importFromText(text, root);
      } else if (ext === "pdf") {
        this._setStatus(root, "PDF: please paste text instead (PDF.js not available on The Forge)", "error");
      }
    }
  }

  async _importFromText(text, root, type="race") {
    this._setStatus(root, "Step 1/2: Extracting base traits...", "running", "nf-races-status");
    try {
      const part1 = await this._callClaude(
        `D&D 5e race extractor. Return ONLY valid JSON, no markdown.`,
        `Extract race data as JSON with fields: name, source, description, appearance, traits (creatureType, size, speed, abilityScoreIncreases, languages, darkvision), id will be added later. Return ONLY JSON:\n\n${text}`,
        2000
      );
      const part2 = await this._callClaude(
        `D&D 5e race extractor. Return ONLY valid JSON, no markdown.`,
        `Extract racial features, culture, names and NPC hints from this race description as JSON with fields: racialFeatures (array), culture, names (examples array, naming_conventions), npcHints (personalityTraits, occupations). Return ONLY JSON:\n\n${text}`,
        2000
      );
      const p1 = JSON.parse(part1.replace(/```json|```/g,"").trim());
      const p2 = JSON.parse(part2.replace(/```json|```/g,"").trim());
      const data = { ...p1, racialFeatures: p2.racialFeatures||[], culture: p2.culture||{}, names: p2.names||{}, npcHints: p2.npcHints||{}, id: foundry.utils.randomID(), isHomebrew: true };
      let db = [];
      try { db = JSON.parse(game.settings.get("npc-forge","raceDatabase")); } catch(e) {}
      db.push(data);
      await game.settings.set("npc-forge","raceDatabase",JSON.stringify(db));
      this._setStatus(root, `Race "${data.name}" imported!`, "success", "nf-races-status");
      this.render();
    } catch(e) { this._setStatus(root, `Error: ${e.message}`, "error", "nf-races-status"); }
  }

  async _importFromImageB64(b64, mime, root) {
    try {
      const apiKey = game.settings.get("npc-forge","anthropicKey");
      const isOpenRouter = apiKey.startsWith("sk-or-");
      let response;
      if (isOpenRouter) {
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`,"HTTP-Referer":"https://github.com/MrsPein/jens-easy-npc","X-Title":"Jen's easy NPC"},
          body: JSON.stringify({ model:"anthropic/claude-sonnet-4-5", max_tokens:3000, messages:[{role:"system",content:"Extract D&D 5e race data as JSON only."},{role:"user",content:[{type:"image_url",image_url:{url:`data:${mime};base64,${b64}`}},{type:"text",text:"Extract race data as JSON."}]}] })
        });
      } else {
        response = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST", headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
          body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:3000, system:"Extract D&D 5e race data as JSON only.", messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime,data:b64}},{type:"text",text:"Extract race data as JSON."}]}] })
        });
      }
      const data = await response.json();
      const text = isOpenRouter ? data.choices?.[0]?.message?.content : data.content?.[0]?.text;
      const card = JSON.parse(text.replace(/```json|```/g,"").trim());
      card.id = foundry.utils.randomID();
      card.isHomebrew = true;
      let db = [];
      try { db = JSON.parse(game.settings.get("npc-forge","raceDatabase")); } catch(e) {}
      db.push(card);
      await game.settings.set("npc-forge","raceDatabase",JSON.stringify(db));
      this._setStatus(root, `Race "${card.name}" imported!`, "success");
      this.render();
    } catch(e) { this._setStatus(root, `Error: ${e.message}`, "error"); }
  }

  async _callClaude(system, user, maxTokens=2000) {
    const apiKey = game.settings.get("npc-forge","anthropicKey");
    if (!apiKey) throw new Error("No API key! Please add it in Settings tab.");
    const isOpenRouter = apiKey.startsWith("sk-or-");
    let response;
    if (isOpenRouter) {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`,"HTTP-Referer":"https://github.com/MrsPein/jens-easy-npc","X-Title":"Jen's easy NPC"},
        body: JSON.stringify({ model:"anthropic/claude-sonnet-4-5", max_tokens:maxTokens, messages:[{role:"system",content:system},{role:"user",content:user}] })
      });
    } else {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:maxTokens, system, messages:[{role:"user",content:user}] })
      });
    }
    if (!response.ok) { const e=await response.json().catch(()=>({})); throw new Error(`API error ${response.status}: ${e?.error?.message||e?.message||response.statusText}`); }
    const data = await response.json();
    return isOpenRouter ? data.choices?.[0]?.message?.content : data.content?.[0]?.text;
  }

  async _generateNPC(root) {
    const btn = root.querySelector(".nf-generate-btn");
    if (btn) btn.disabled = true;
    try {
      let raceCard = null;
      if (this._npcParams.raceId) {
        let db = [];
        try { db = JSON.parse(game.settings.get("npc-forge","raceDatabase")); } catch(e) {}
        raceCard = db.find(r => r.id === this._npcParams.raceId);
      }

      const specialWish = root.querySelector("#nf-special-wish")?.value?.trim() || null;
      const wealth = this._npcParams.wealth || "normal";
      const age = this._npcParams.age || "normal";
      const gender = this._npcParams.gender || null;
      const outputLang = t("outputLang"); // "Deutsch" or "English"
      const lang = getNFLang();

      this._setStatus(root, t("step1"), "running", "nf-create-status");

      const raceDesc = raceCard
        ? `Race: ${raceCard.name}. ${raceCard.appearance?.description||""}. Appearance features: ${(raceCard.appearance?.distinctiveFeatures||[]).join(", ")||"humanoid"}. Naming conventions: ${raceCard.names?.naming_conventions||"fantasy names"}. Name examples: ${(raceCard.names?.examples||[]).slice(0,6).join(", ")||"none"}.`
        : "Race: Human. Standard humanoid appearance.";

      // Name diversity seeds
      const nameSeeds = [
        "Vorlan","Thisbe","Kreth","Umara","Belwick","Saoirse","Dravix","Fennick",
        "Zorath","Lirien","Casmyr","Ondra","Brix","Tessavel","Gorruk","Maeven",
        "Ydrel","Skarix","Nunna","Pholt","Rewynn","Azhak","Tolvi","Sebbe","Crusk",
        "Imwen","Dallor","Huvex","Mirka","Orbis","Thalke","Junsa","Wex","Provi",
        "Salnek","Drosi","Kelvar","Osmur","Yithel","Faxon"
      ];
      const nameStyles = [
        "one syllable, blunt and memorable",
        "two syllables, earthy and common",
        "two syllables, exotic or foreign-sounding",
        "three syllables, noble or ancient",
        "unusual consonant cluster",
        "ends in a vowel, melodic",
        "starts with rare letter (X, Z, Q, W, Y)",
        "sounds like a nickname or trade name",
        "compound of two short roots"
      ];
      const nameSeed = nameSeeds[Math.floor(Math.random() * nameSeeds.length)];
      const nameStyle = nameStyles[Math.floor(Math.random() * nameStyles.length)];

      const wealthDesc = {
        poor: lang==="de" ? "arm, zerlumpt, abgenutzte Kleidung" : "poor, ragged, worn clothing",
        modest: lang==="de" ? "bescheiden, einfache saubere Kleidung" : "modest, simple clean clothing",
        normal: lang==="de" ? "durchschnittlich, normale Kleidung" : "average, normal clothing",
        wealthy: lang==="de" ? "wohlhabend, gute Kleidung, Schmuck" : "wealthy, fine clothing, jewelry",
        noble: lang==="de" ? "adelig, luxuriöse Kleidung, edle Accessoires" : "noble, luxurious clothing, fine accessories"
      }[wealth] || wealth;

      const ageDesc = {
        young: lang==="de" ? "jung (Teenager bis Mitte 20)" : "young (teens to mid-20s)",
        normal: lang==="de" ? "mittleres Alter (30er bis 50er)" : "middle-aged (30s to 50s)",
        old: lang==="de" ? "alt (60er und älter)" : "old (60s and older)"
      }[age] || age;

      const prompt = `You are a D&D 5e NPC generator. Generate a complete NPC and return ONLY valid JSON.

OUTPUT LANGUAGE: ${outputLang}
IMPORTANT: ALL text fields (name, backstory, appearance descriptions, personality, ideal, bond, flaw, occupation) MUST be written in ${outputLang}. The name must sound natural and fitting for the race in ${outputLang}-speaking regions or fantasy equivalents.

${raceDesc}

Parameters:
- Gender: ${gender || (lang==="de" ? "zufällig" : "random")}
- Age: ${ageDesc}
- Wealth: ${wealthDesc}
${specialWish ? `- Special personal wishes (incorporate into occupation/backstory/appearance as appropriate): ${specialWish}` : ""}

=== NAME RULES ===
- Name MUST be unique and creative in ${outputLang} style
- Style: ${nameStyle}
- Inspiration seed (sound only, do NOT copy): "${nameSeed}"
- FORBIDDEN generic names: Aldric, Mira, Gareth, Elena, Theron, Sera, Dorin, Lyra, Vane, Aria, Kael, Zara, Elden, Nora, Bran, Talia, Orin, Lena, Cedric, Isolde, Rowan, Quinn, Finn, Silver, Storm, Drake
- For German output: names may use German phonetics (e.g. Schimmer, Glut, Flosse, Fluss) or fantasy variants thereof
=== END NAME RULES ===

Return JSON with exactly these fields:
{
  "name": "",
  "race": "",
  "class": "",
  "occupation": "",
  "background": "",
  "gender": "",
  "age": "",
  "alignment": "",
  "personality": [],
  "ideal": "",
  "bond": "",
  "flaw": "",
  "appearance": {
    "height": "", "build": "", "skinColor": "", "eyeColor": "",
    "hairOrFeatures": "", "clothing": "", "distinguishingFeatures": ""
  },
  "stats": {
    "CR": 0, "HP": 10, "AC": 10,
    "STR": 10, "DEX": 10, "CON": 10, "INT": 10, "WIS": 10, "CHA": 10,
    "speed": 30, "skills": [], "languages": []
  },
  "equipment": [],
  "backstory": "",
  "portraitPrompt": ""
}`;

      const raw = await this._callClaude(
        `You are a D&D 5e NPC generator. Return only valid JSON, no markdown, no preamble. All text in ${outputLang}.`,
        prompt, 2500
      );
      const npcData = JSON.parse(raw.replace(/```json|```/g,"").trim());

      this._setStatus(root, t("step2"), "running", "nf-create-status");

      const actor = await Actor.create({
        name: npcData.name,
        type: "npc",
        img: "icons/svg/mystery-man.svg",
        system: {
          details: {
            biography: {
              value: `<p>${npcData.backstory||""}</p>
<p><b>${lang==="de"?"Beruf":"Occupation"}:</b> ${npcData.occupation||""}</p>
<p><b>${lang==="de"?"Ideal":"Ideal"}:</b> ${npcData.ideal||""} &nbsp;|&nbsp; <b>${lang==="de"?"Bindung":"Bond"}:</b> ${npcData.bond||""} &nbsp;|&nbsp; <b>${lang==="de"?"Schwäche":"Flaw"}:</b> ${npcData.flaw||""}</p>
${npcData.appearance ? `<p><b>${lang==="de"?"Aussehen":"Appearance"}:</b> ${npcData.appearance.height||""}, ${npcData.appearance.build||""}, ${npcData.appearance.skinColor||""}, ${npcData.appearance.eyeColor||""} ${lang==="de"?"Augen":"eyes"}. ${npcData.appearance.distinguishingFeatures||""}</p><p><b>${lang==="de"?"Kleidung":"Clothing"}:</b> ${npcData.appearance.clothing||""}</p>` : ""}
${npcData.personality?.length ? `<p><b>${lang==="de"?"Persönlichkeit":"Personality"}:</b> ${npcData.personality.join(", ")}</p>` : ""}`
            },
            race: npcData.race || "",
            background: npcData.background || "",
            alignment: npcData.alignment || "",
            cr: npcData.stats?.CR || 0,
            type: { value: "humanoid" }
          },
          attributes: {
            hp: { value: npcData.stats?.HP || 10, max: npcData.stats?.HP || 10 },
            ac: { flat: npcData.stats?.AC || 10 },
            movement: { walk: npcData.stats?.speed || 30 }
          },
          abilities: {
            str: { value: npcData.stats?.STR || 10 },
            dex: { value: npcData.stats?.DEX || 10 },
            con: { value: npcData.stats?.CON || 10 },
            int: { value: npcData.stats?.INT || 10 },
            wis: { value: npcData.stats?.WIS || 10 },
            cha: { value: npcData.stats?.CHA || 10 }
          }
        }
      });
      actor.sheet.render(true);
      this._setStatus(root, t("done", npcData.name), "success", "nf-create-status");
    } catch(e) {
      console.error("NPC Forge error:", e);
      this._setStatus(root, `Error: ${e.message}`, "error", "nf-create-status");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  _setStatus(root, text, type, statusId) {
    let el;
    if (statusId) {
      el = root.querySelector(`#${statusId}`);
    } else {
      const activePanel = root.querySelector(".nf-panel.active");
      if (activePanel) el = activePanel.querySelector(".nf-status");
    }
    if (!el) el = root.querySelector(".nf-status");
    if (!el) return;
    el.textContent = text;
    el.className = `nf-status ${type}`;
  }
}
