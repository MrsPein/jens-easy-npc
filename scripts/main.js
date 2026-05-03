// NPC Forge - main entry point

// Wait for Foundry to be ready
Hooks.once("ready", () => {
  console.log("NPC Forge | Ready - injecting button...");
  setTimeout(() => NpcForge._injectButton(), 1500);
});

Hooks.on("renderSceneControls", () => {
  setTimeout(() => NpcForge._injectButton(), 300);
});

// Global NpcForge object
window.NpcForge = {
  _panel: null,

  open() {
    if (!this._panel) {
      this._panel = new NpcForgePanel();
    }
    if (this._panel.rendered) {
      this._panel.close();
    } else {
      this._panel.render(true);
    }
  },

  _injectButton() {
    if (document.querySelector("[data-npcforge-btn]")) return;

    const menu = document.querySelector("#scene-controls menu") ||
                 document.querySelector("#sidebar-tabs menu");
    if (!menu) {
      console.warn("NPC Forge | Could not find menu, retrying...");
      setTimeout(() => NpcForge._injectButton(), 1000);
      return;
    }

    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.setAttribute("data-npcforge-btn", "1");
    btn.type = "button";
    btn.className = "control ui-control layer icon fa-solid fa-user-plus";
    btn.title = "NPC Forge – Jen's easy NPC";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      NpcForge.open();
    });
    li.appendChild(btn);
    menu.appendChild(li);
    console.log("NPC Forge | Button injected!");
  }
};

// ── Settings ─────────────────────────────────────────────────────────────

Hooks.once("init", () => {
  console.log("NPC Forge | Initialising...");

  game.settings.register("npc-forge", "anthropicKey", {
    name: "Anthropic / OpenRouter API Key", scope: "world", config: true, type: String, default: ""
  });
  game.settings.register("npc-forge", "imageProvider", {
    name: "Image Generator", scope: "world", config: true, type: String,
    choices: { "imagen": "Google Imagen 3", "dalle": "OpenAI DALL-E 3" }, default: "imagen"
  });
  game.settings.register("npc-forge", "imageApiKey", {
    name: "Image API Key", scope: "world", config: true, type: String, default: ""
  });
  game.settings.register("npc-forge", "raceDatabase", { scope: "world", config: false, type: String, default: "[]" });
  game.settings.register("npc-forge", "classDatabase", { scope: "world", config: false, type: String, default: "[]" });

  Handlebars.registerHelper("eq", (a, b) => a === b);
});

// ── Panel Application ─────────────────────────────────────────────────────

class NpcForgePanel extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "npc-forge-sidebar",
      title: "Jen's easy NPC",
      template: "modules/npc-forge/templates/sidebar.html",
      width: 360,
      height: 720,
      resizable: true
    });
  }

  _activeTab = "create";
  _npcParams = {};
  _searchTimers = {};

  getData() {
    let races = [], classes = [];
    try { races = JSON.parse(game.settings.get("npc-forge", "raceDatabase")); } catch(e) {}
    try { classes = JSON.parse(game.settings.get("npc-forge", "classDatabase")); } catch(e) {}
    return { races, classes, activeTab: this._activeTab };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html instanceof HTMLElement ? html : html[0];

    // Tabs
    root.querySelectorAll(".npcforge-tab").forEach(tab => {
      tab.addEventListener("click", e => {
        this._activeTab = e.currentTarget.dataset.tab;
        root.querySelectorAll(".npcforge-tab").forEach(t => t.classList.remove("active"));
        root.querySelectorAll(".npcforge-panel").forEach(p => p.classList.remove("active"));
        e.currentTarget.classList.add("active");
        root.querySelector(`.npcforge-panel[data-tab="${this._activeTab}"]`)?.classList.add("active");
      });
    });

    // Chips
    root.querySelectorAll(".npcforge-chip").forEach(chip => {
      chip.addEventListener("click", e => {
        const group = e.currentTarget.dataset.group;
        root.querySelectorAll(`.npcforge-chip[data-group="${group}"]`).forEach(c => c.classList.remove("selected"));
        e.currentTarget.classList.add("selected");
        this._npcParams[group] = e.currentTarget.dataset.value;
      });
    });

    // Search boxes with live results
    this._setupSearch(root, "race-search", "race-results", q => {
      let races = [];
      try { races = JSON.parse(game.settings.get("npc-forge", "raceDatabase")); } catch(e) {}
      return races.filter(r => r.name.toLowerCase().includes(q.toLowerCase()))
        .map(r => `<div class="npcforge-result-item" data-id="${r.id}" data-type="race"><span class="item-name">${r.name}</span><span class="item-source">${r.source||""}</span></div>`).join("")
        || `<div class="npcforge-no-results">No races found</div>`;
    });

    this._setupSearch(root, "bg-search", "bg-results", async q => {
      const results = [];
      for (const item of game.items) {
        if (item.type === "background" && item.name.toLowerCase().includes(q.toLowerCase())) {
          results.push(`<div class="npcforge-result-item" data-name="${item.name}" data-type="background"><span class="item-name">${item.name}</span><span class="item-source">World</span></div>`);
        }
      }
      for (const pack of game.packs) {
        if (results.length > 20) break;
        try {
          const index = await pack.getIndex();
          for (const e of index) {
            if (e.name.toLowerCase().includes(q.toLowerCase())) {
              results.push(`<div class="npcforge-result-item" data-name="${e.name}" data-type="background"><span class="item-name">${e.name}</span><span class="item-source">${pack.metadata.label}</span></div>`);
              if (results.length > 20) break;
            }
          }
        } catch(e) {}
      }
      return results.join("") || `<div class="npcforge-no-results">No results</div>`;
    });

    this._setupSearch(root, "occ-search", "occ-results", q => {
      const common = ["Blacksmith","Innkeeper","Guard","Merchant","Farmer","Apothecary","Scholar","Sailor","Thief","Priest","Hunter","Herbalist","Cook","Scribe","Cartographer"];
      return common.filter(o => o.toLowerCase().includes(q.toLowerCase()))
        .map(o => `<div class="npcforge-result-item" data-name="${o}" data-type="occupation"><span class="item-name">${o}</span></div>`).join("")
        || `<div class="npcforge-no-results">Type occupation name</div>`;
    });

    // Result clicks
    root.addEventListener("click", e => {
      const item = e.target.closest(".npcforge-result-item");
      if (!item) return;
      const type = item.dataset.type;
      const name = item.dataset.name || item.querySelector(".item-name")?.textContent;
      const id = item.dataset.id;
      if (type === "race") { this._npcParams.raceId = id; this._npcParams.raceName = name; root.querySelector("#race-search").value = name; root.querySelector("#race-results").style.display="none"; }
      else if (type === "background") { this._npcParams.background = name; root.querySelector("#bg-search").value = name; root.querySelector("#bg-results").style.display="none"; }
      else if (type === "occupation") { this._npcParams.occupation = name; root.querySelector("#occ-search").value = name; root.querySelector("#occ-results").style.display="none"; }
    });

    // Generate button
    root.querySelector(".npcforge-generate-btn")?.addEventListener("click", () => this._generateNPC(root));

    // Import text
    root.querySelector(".npcforge-import-text-btn")?.addEventListener("click", () => {
      const text = root.querySelector(".npcforge-import-textarea")?.value?.trim();
      if (text) this._importFromText(text, root);
    });

    // Dropzone
    const dz = root.querySelector(".npcforge-dropzone");
    if (dz) {
      dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("drag-over"); });
      dz.addEventListener("dragleave", () => dz.classList.remove("drag-over"));
      dz.addEventListener("drop", e => { e.preventDefault(); dz.classList.remove("drag-over"); this._handleFiles(e.dataTransfer.files, root); });
      dz.addEventListener("click", () => { const inp = document.createElement("input"); inp.type="file"; inp.multiple=true; inp.accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"; inp.onchange=()=>this._handleFiles(inp.files,root); inp.click(); });
    }

    // Settings save
    root.querySelector(".npcforge-save-settings")?.addEventListener("click", async () => {
      const k = root.querySelector("[name=anthropicKey]")?.value;
      const p = root.querySelector("[name=imageProvider]")?.value;
      const ik = root.querySelector("[name=imageApiKey]")?.value;
      if (k) await game.settings.set("npc-forge","anthropicKey",k);
      if (p) await game.settings.set("npc-forge","imageProvider",p);
      if (ik) await game.settings.set("npc-forge","imageApiKey",ik);
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

  async _importFromText(text, root) {
    this._setStatus(root, "Analysing with Claude...", "running");
    try {
      const card = await this._callClaude(
        `You are a D&D 5e race extractor. Return ONLY valid JSON with fields: name, source, description, appearance{description,inspiration,skinColors[],eyeColors[],heightRange,distinctiveFeatures[]}, traits{creatureType,size,speed{walk,swim,fly},abilityScoreIncreases,age{adulthood,lifespan},alignment,languages[],racialFeatures[{name,description}]}, culture{homeland,values[],habits[],likes[],dislikes[]}, names{examples[]}, npcHints{portraitPromptBase}`,
        `Extract race data from:

${text}`
      );
      const data = JSON.parse(card.replace(/\`\`\`json|\`\`\`/g,"").trim());
      data.id = foundry.utils.randomID();
      data.isHomebrew = true;
      let db = [];
      try { db = JSON.parse(game.settings.get("npc-forge","raceDatabase")); } catch(e) {}
      db.push(data);
      await game.settings.set("npc-forge","raceDatabase",JSON.stringify(db));
      this._setStatus(root, `Race "${data.name}" imported!`, "success");
      this.render();
    } catch(e) { this._setStatus(root, `Error: ${e.message}`, "error"); }
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
      const card = JSON.parse(text.replace(/\`\`\`json|\`\`\`/g,"").trim());
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
    const btn = root.querySelector(".npcforge-generate-btn");
    if (btn) btn.disabled = true;
    try {
      let raceCard = null;
      if (this._npcParams.raceId) {
        let db = [];
        try { db = JSON.parse(game.settings.get("npc-forge","raceDatabase")); } catch(e) {}
        raceCard = db.find(r => r.id === this._npcParams.raceId);
      }
      const specialWish = root.querySelector("#special-wish")?.value?.trim() || null;
      const wealth = this._npcParams.wealth || "normal";
      const age = this._npcParams.age || "normal";
      const gender = this._npcParams.gender || null;

      this._setStatus(root, "Step 1/3: Generating NPC...", "running");
      const raceDesc = raceCard ? `Race: ${raceCard.name}. ${raceCard.appearance?.description||""}. Colors: ${(raceCard.appearance?.skinColors||[]).join(", ")}. Features: ${(raceCard.appearance?.distinctiveFeatures||[]).join(", ")}.` : "Race: Human";
      const prompt = `Generate a D&D 5e NPC. Return ONLY JSON with: name, race, class, occupation, background, gender, age, alignment, personality[], ideal, bond, flaw, appearance{height,build,skinColor,eyeColor,hairOrFeatures,clothing,distinguishingFeatures}, stats{CR,HP,AC,STR,DEX,CON,INT,WIS,CHA,speed,skills[],languages[]}, equipment[], backstory, portraitPrompt.
${raceDesc}
Occupation: ${this._npcParams.occupation||"random"}
Background: ${this._npcParams.background||"random"}  
Gender: ${gender||"random"}
Age: ${age} (young=teens-20s, normal=30s-50s, old=60s+)
Wealth: ${wealth} (arm=poor/ragged, normal=average, aristokratisch=noble/luxury)
${specialWish ? `Special visual: ${specialWish}` : ""}
Make portraitPrompt very detailed with exact appearance, clothing matching wealth level, fantasy portrait painterly style.`;

      const raw = await this._callClaude("You are a D&D 5e NPC generator. Return only valid JSON.", prompt);
      const npcData = JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g,"").trim());

      this._setStatus(root, "Step 2/3: Generating portrait...", "running");
      let portraitPath = "icons/svg/mystery-man.svg";
      try {
        const imageKey = game.settings.get("npc-forge","imageApiKey");
        const provider = game.settings.get("npc-forge","imageProvider");
        if (imageKey) {
          let imageDataUrl;
          if (provider === "dalle") {
            const ir = await fetch("https://api.openai.com/v1/images/generations", {
              method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${imageKey}`},
              body: JSON.stringify({model:"dall-e-3",prompt:npcData.portraitPrompt.slice(0,4000),n:1,size:"1024x1024",quality:"standard",response_format:"b64_json"})
            });
            const id = await ir.json();
            imageDataUrl = `data:image/png;base64,${id.data?.[0]?.b64_json}`;
          } else {
            const ir = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${imageKey}`, {
              method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({instances:[{prompt:npcData.portraitPrompt}],parameters:{sampleCount:1,aspectRatio:"1:1",personGeneration:"allow_adult",safetyFilterLevel:"block_few"}})
            });
            const id = await ir.json();
            imageDataUrl = `data:image/png;base64,${id.predictions?.[0]?.bytesBase64Encoded}`;
          }
          if (imageDataUrl && !imageDataUrl.includes("undefined")) {
            const res = await fetch(imageDataUrl);
            const blob = await res.blob();
            const fname = `${npcData.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${Date.now()}.png`;
            const file = new File([blob], fname, {type:"image/png"});
            try { await FilePicker.createDirectory("data","npc-forge"); } catch(e) {}
            const up = await FilePicker.upload("data","npc-forge",file,{});
            portraitPath = up.path;
          }
        }
      } catch(e) { console.warn("NPC Forge | Portrait generation failed:", e); }

      this._setStatus(root, "Step 3/3: Creating actor...", "running");
      const actor = await Actor.create({
        name: npcData.name, type: "npc", img: portraitPath,
        system: {
          details: { biography:{value:`<p>${npcData.backstory||""}</p><p><b>Occupation:</b> ${npcData.occupation||""}</p>${npcData.appearance?`<p><b>Appearance:</b> ${npcData.appearance.height||""}, ${npcData.appearance.build||""}, ${npcData.appearance.skinColor||""} skin, ${npcData.appearance.eyeColor||""} eyes. ${npcData.appearance.distinguishingFeatures||""}</p><p><b>Clothing:</b> ${npcData.appearance.clothing||""}</p>`:""}`}, race:npcData.race||"", background:npcData.background||"", alignment:npcData.alignment||"", cr:npcData.stats?.CR||0, type:{value:"humanoid"} },
          attributes: { hp:{value:npcData.stats?.HP||10,max:npcData.stats?.HP||10}, ac:{flat:npcData.stats?.AC||10}, movement:{walk:30} },
          abilities: { str:{value:npcData.stats?.STR||10}, dex:{value:npcData.stats?.DEX||10}, con:{value:npcData.stats?.CON||10}, int:{value:npcData.stats?.INT||10}, wis:{value:npcData.stats?.WIS||10}, cha:{value:npcData.stats?.CHA||10} }
        }
      });
      actor.sheet.render(true);
      this._setStatus(root, `Done! "${npcData.name}" created!`, "success");
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
