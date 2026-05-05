// NPC Forge v0.5.0 - main entry point

Hooks.once("ready", () => {
  console.log("NPC Forge | Ready");
  setTimeout(() => NpcForge._injectButton(), 1500);
});
Hooks.on("renderSceneControls", () => setTimeout(() => NpcForge._injectButton(), 300));

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
    btn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); NpcForge.open(); });
    li.appendChild(btn);
    menu.appendChild(li);
  }
};

// ── i18n ─────────────────────────────────────────────────────────────────────
const NF_I18N = {
  de: {
    tabCreate:"Erstellen", tabRaces:"Rassen", tabClasses:"Klassen",
    tabBackgrounds:"Hintergründe", tabSettings:"Einstellungen",
    labelName:"Name", labelRace:"Rasse", labelClass:"Klasse",
    labelCR:"CR", labelGender:"Geschlecht", labelAge:"Alter",
    labelWealth:"Wohlstand", labelAlignment:"Gesinnung", labelWish:"Besonderer Wunsch",
    wishPlaceholder:"z.B. Köchin mit Leibgericht Mückeneintopf, hat blaue Haare, trägt goldene Ohrringe...",
    namePlaceholder:"Leer lassen für auto-generierten Namen",
    gRandom:"Zufällig", gMale:"Männlich", gFemale:"Weiblich", gNonBinary:"Divers",
    aYoung:"Jung", aNormal:"Normal", aOld:"Alt",
    wPoor:"Arm", wModest:"Bescheiden", wNormal:"Normal", wWealthy:"Wohlhabend", wNoble:"Adelig",
    alignLG:"Rechtschaffen Gut", alignNG:"Neutral Gut", alignCG:"Chaotisch Gut",
    alignLN:"Rechtschaffen Neutral", alignN:"Neutral", alignCN:"Chaotisch Neutral",
    alignLE:"Rechtschaffen Böse", alignNE:"Neutral Böse", alignCE:"Chaotisch Böse",
    btnGenerate:"NPC Generieren", btnSaveSettings:"Einstellungen speichern",
    settingsSaved:"Gespeichert!", step1:"Schritt 1/3: NPC wird generiert...",
    step2:"Schritt 2/3: Items werden geladen...", step3:"Schritt 3/3: Charakter wird erstellt...",
    done: n => `✓ "${n}" erstellt!`, errorNoKey:"Kein API-Key in den Einstellungen!",
    searchRace:"Rassen suchen...", selectAll:"Alle", selectNone:"Keine",
    noRacesYet:"Noch keine Rassen importiert.", noClassesYet:"Noch keine Klassen importiert.",
    noBgsYet:"Noch keine Hintergründe importiert.",
    importFromText:"Aus Text importieren", pasteDesc:"Beschreibung einfügen...",
    savedEntries: n => `Gespeicherte Einträge (${n})`, optional:"optional",
    classNone:"Normalo (keine Klasse)", outputLang:"Deutsch",
    labelItemsComp:"Items Compendium (leer = auto)", labelSpellsComp:"Spells Compendium (leer = auto)",
    labelFuzzy:"Fuzzy-Suche Toleranz",
    importRace:"Rasse importieren", importClass:"Klasse importieren", importBg:"Hintergrund importieren",
    syncing:"Synchronisiere mit Foundry...", syncDone:"Synchronisiert!",
  },
  en: {
    tabCreate:"Create", tabRaces:"Races", tabClasses:"Classes",
    tabBackgrounds:"Backgrounds", tabSettings:"Settings",
    labelName:"Name", labelRace:"Race", labelClass:"Class",
    labelCR:"CR", labelGender:"Gender", labelAge:"Age",
    labelWealth:"Wealth", labelAlignment:"Alignment", labelWish:"Special Personal Wish",
    wishPlaceholder:"e.g. cook with favourite dish mosquito stew, has blue hair, wears golden earrings...",
    namePlaceholder:"Leave empty for auto-generated name",
    gRandom:"Random", gMale:"Male", gFemale:"Female", gNonBinary:"Non-binary",
    aYoung:"Young", aNormal:"Normal", aOld:"Old",
    wPoor:"Poor", wModest:"Modest", wNormal:"Normal", wWealthy:"Wealthy", wNoble:"Noble",
    alignLG:"Lawful Good", alignNG:"Neutral Good", alignCG:"Chaotic Good",
    alignLN:"Lawful Neutral", alignN:"Neutral", alignCN:"Chaotic Neutral",
    alignLE:"Lawful Evil", alignNE:"Neutral Evil", alignCE:"Chaotic Evil",
    btnGenerate:"Generate NPC", btnSaveSettings:"Save Settings",
    settingsSaved:"Saved!", step1:"Step 1/3: Generating NPC...",
    step2:"Step 2/3: Loading items...", step3:"Step 3/3: Creating actor...",
    done: n => `✓ "${n}" created!`, errorNoKey:"No API key in settings!",
    searchRace:"Search races...", selectAll:"All", selectNone:"None",
    noRacesYet:"No races imported yet.", noClassesYet:"No classes imported yet.",
    noBgsYet:"No backgrounds imported yet.",
    importFromText:"Import from text", pasteDesc:"Paste description...",
    savedEntries: n => `Saved entries (${n})`, optional:"optional",
    classNone:"Commoner (no class)", outputLang:"English",
    labelItemsComp:"Items Compendium (empty = auto)", labelSpellsComp:"Spells Compendium (empty = auto)",
    labelFuzzy:"Fuzzy Search Tolerance",
    importRace:"Import Race", importClass:"Import Class", importBg:"Import Background",
    syncing:"Syncing with Foundry...", syncDone:"Synced!",
  }
};
function getLang() {
  try { const l = game.settings.get("core","language")||"en"; return l.startsWith("de")?"de":"en"; } catch(e){return "en";}
}
function t(k,...a) {
  const d = NF_I18N[getLang()]||NF_I18N.en;
  const v = d[k]||NF_I18N.en[k]||k;
  return typeof v==="function"?v(...a):v;
}

// ── CR Tables (from dataStructures.js) ───────────────────────────────────────
const NF_CR = {
  list: [0,0.125,0.25,0.5,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
  label: cr => cr===0.125?"1/8":cr===0.25?"1/4":cr===0.5?"1/2":String(cr),
  getAC(cr) {
    if(cr==0) return 10+Math.floor(Math.random()*4);
    if(cr<=3) return 13; if(cr<=7) return 15; if(cr<=9) return 16;
    if(cr<=12) return 17; if(cr<=16) return 18; return 19;
  },
  getAvgHP(cr) {
    if(cr==0) return 4+Math.floor(Math.random()*3);
    if(cr==0.125) return 7+Math.floor(Math.random()*28);
    if(cr==0.25) return 13+Math.floor(Math.random()*36);
    if(cr==0.5) return 20+Math.floor(Math.random()*50);
    return Math.floor(70+15*cr - Math.random()*14);
  },
  getProfBonus(cr) { return Math.max(2, Math.floor((cr-1)/4)+2); },
  skillsForClass: {
    barbarian:["ath","ani","prc","sur","nat","itm"],
    bard:["prf","per","dec","ins","his","arc","acr","ste","slt","itm","ani","inv","med","nat","rel","sur","ath"],
    cleric:["his","ins","med","per","rel"],
    druid:["ani","arc","ins","med","nat","prc","rel","sur"],
    fighter:["acr","ani","ath","itm","ins","prc","sur","his"],
    monk:["acr","ath","ste","ins","rel","his"],
    paladin:["ath","itm","ins","med","per","rel"],
    ranger:["ani","ath","ste","inv","ins","nat","prc","sur"],
    rogue:["acr","ath","ste","inv","dec","itm","prf","ins","prc","per","slt"],
    sorcerer:["arc","dec","itm","ins","per","rel"],
    warlock:["arc","inv","dec","itm","nat","rel","his"],
    wizard:["arc","inv","ins","med","rel","his"],
    commoner:["acr","ani","arc","ath","dec","his","ins","inv","itm","med","nat","per","prc","prf","rel","slt","ste","sur"]
  },
  savesForClass: {
    barbarian:["str","con"], bard:["dex","cha"], cleric:["wis","cha"],
    druid:["int","wis"], fighter:["str","con"], monk:["str","dex"],
    paladin:["wis","cha"], ranger:["str","dex"], rogue:["dex","int"],
    sorcerer:["con","cha"], warlock:["wis","cha"], wizard:["int","wis"],
    commoner:[]
  },
  spellcastingForClass: {
    bard:"cha", cleric:"wis", druid:"wis", monk:"wis", paladin:"cha",
    ranger:"wis", sorcerer:"cha", warlock:"cha", wizard:"int"
  },
  roll4d6() {
    const r=[1,2,3,4].map(()=>1+Math.floor(Math.random()*6));
    r.sort((a,b)=>a-b); r.shift(); return r.reduce((a,b)=>a+b,0);
  },
  scaleAbilities(base, cr, saves) {
    const ab = {};
    ["str","dex","con","int","wis","cha"].forEach(k=>{
      ab[k]={value:base[k]||this.roll4d6(), proficient:saves.includes(k)?1:0};
    });
    const bonus = Math.floor(cr/2);
    saves.forEach(s=>{ if(ab[s]) ab[s].value=Math.min(20,ab[s].value+Math.floor(bonus*0.6)); });
    return ab;
  }
};

// ── Settings ──────────────────────────────────────────────────────────────────
Hooks.once("init", () => {
  const reg = (k,cfg) => game.settings.register("npc-forge", k, cfg);
  reg("anthropicKey",{name:"API Key",scope:"world",config:true,type:String,default:""});
  reg("itemsComp",{scope:"world",config:false,type:String,default:""});
  reg("spellsComp",{scope:"world",config:false,type:String,default:""});
  reg("fuzzyThreshold",{scope:"world",config:false,type:Number,default:0.4});
  reg("raceDatabase",{scope:"world",config:false,type:String,default:"[]"});
  reg("classDatabase",{scope:"world",config:false,type:String,default:"[]"});
  reg("bgDatabase",{scope:"world",config:false,type:String,default:"[]"});
  Handlebars.registerHelper("eq",(a,b)=>a===b);
});

// ── Foundry Item Sync ─────────────────────────────────────────────────────────
const NfSync = {
  async ensureFolder(name, type="Item") {
    let folder = game.folders.find(f=>f.name===name&&f.type===type);
    if(!folder) folder = await Folder.create({name,type,color:"#6b5acd"});
    return folder;
  },
  async syncToFoundry(entry, folderName, itemType) {
    try {
      const folder = await this.ensureFolder(folderName);
      const existing = game.items.find(i=>i.name===entry.name&&i.folder?.id===folder.id);
      if(existing) { await existing.update({system:{description:{value:entry.description||""}}}); return existing; }
      const item = await Item.create({
        name: entry.name, type: itemType||"feat", folder: folder.id,
        img: entry.img||"icons/svg/book.svg",
        system:{ description:{value: `<p>${entry.description||""}</p>`} }
      });
      return item;
    } catch(e) { console.warn("NPC Forge | sync failed:", e); }
  },
  _isRealSpecies(name) {
    const n = name.toLowerCase();
    const exclude = ["breath weapon","lore","feat","trait","ability","attack","strike","armor","casing","amorphous","artificer","subrace","variant","legacy","action","feature","fighting style","invocation","maneuver","eldritch","divine","arcane","infusion"];
    return !exclude.some(kw => n.includes(kw));
  },
  async getAllSpecies() {
    const results = new Map();
    // From our race DB (highest priority)
    try {
      const db = JSON.parse(game.settings.get("npc-forge","raceDatabase"));
      db.forEach(r=>{ if(r.name) results.set(r.name.toLowerCase(),{name:r.name,source:"Custom",data:r}); });
    } catch(e){}
    // From Foundry world items - only type="species"
    game.items.forEach(i=>{
      if(i.type==="species" && this._isRealSpecies(i.name)) {
        const k=i.name.toLowerCase();
        if(!results.has(k)) results.set(k,{name:i.name,source:"Foundry",data:null,item:i});
      }
    });
    // From packs - STRICTLY only type="species"
    for(const pack of game.packs) {
      try {
        const idx = await pack.getIndex({fields:["name","type"]});
        for(const e of idx) {
          if(e.type !== "species") continue;
          const k=e.name.toLowerCase();
          if(!results.has(k) && this._isRealSpecies(e.name)) {
            results.set(k,{name:e.name,source:pack.metadata.label,data:null,packId:pack.collection,docId:e._id});
          }
        }
      } catch(e){}
    }
    return Array.from(results.values()).sort((a,b)=>a.name.localeCompare(b.name));
  },
  async getAllClasses() {
    const results = new Map();
    try {
      const db = JSON.parse(game.settings.get("npc-forge","classDatabase"));
      db.forEach(c=>{ if(c.name) results.set(c.name.toLowerCase(),{name:c.name,source:"Custom",data:c}); });
    } catch(e){}
    game.items.forEach(i=>{
      if(i.folder?.name==="Classes"||i.type==="class") {
        const k=i.name.toLowerCase();
        if(!results.has(k)) results.set(k,{name:i.name,source:"Foundry"});
      }
    });
    for(const pack of game.packs) {
      try {
        const idx = await pack.getIndex({fields:["name","type"]});
        for(const e of idx) {
          const k=e.name.toLowerCase();
          if(!results.has(k)&&e.type==="class") results.set(k,{name:e.name,source:pack.metadata.label});
        }
      } catch(e){}
    }
    return Array.from(results.values()).sort((a,b)=>a.name.localeCompare(b.name));
  },
  async getAllBackgrounds() {
    const results = new Map();
    try {
      const db = JSON.parse(game.settings.get("npc-forge","bgDatabase"));
      db.forEach(b=>{ if(b.name) results.set(b.name.toLowerCase(),{name:b.name,source:"Custom",data:b}); });
    } catch(e){}
    game.items.forEach(i=>{
      if(i.folder?.name==="Backgrounds"||i.type==="background") {
        const k=i.name.toLowerCase();
        if(!results.has(k)) results.set(k,{name:i.name,source:"Foundry"});
      }
    });
    for(const pack of game.packs) {
      try {
        const idx = await pack.getIndex({fields:["name","type"]});
        for(const e of idx) {
          const k=e.name.toLowerCase();
          if(!results.has(k)&&e.type==="background") results.set(k,{name:e.name,source:pack.metadata.label});
        }
      } catch(e){}
    }
    return Array.from(results.values()).sort((a,b)=>a.name.localeCompare(b.name));
  },
  async getAllCompendiumPacks() {
    return game.packs.contents.map(p=>({id:p.collection,label:p.metadata.label})).sort((a,b)=>a.label.localeCompare(b.label));
  },
  fuzzyFind(query, array, key="name", threshold=0.4) {
    if(!query) return array;
    const q = query.toLowerCase();
    return array.filter(item=>{
      const name = (item[key]||"").toLowerCase();
      if(name.includes(q)) return true;
      // simple fuzzy: check character overlap
      let matches=0, qi=0;
      for(let i=0;i<name.length&&qi<q.length;i++) { if(name[i]===q[qi]){matches++;qi++;} }
      return matches/q.length > (1-threshold);
    });
  },
  async findItemInFoundry(name, packId, threshold=0.4) {
    // Search in specific pack first
    if(packId) {
      try {
        const pack = game.packs.get(packId);
        if(pack) {
          const idx = await pack.getIndex();
          const found = this.fuzzyFind(name, idx.contents, "name", threshold);
          if(found.length>0) return pack.getDocument(found[0]._id);
        }
      } catch(e){}
    }
    // Search in game.items
    const worldItem = this.fuzzyFind(name, game.items.contents, "name", threshold);
    if(worldItem.length>0) return worldItem[0];
    // Search all packs
    for(const pack of game.packs) {
      try {
        const idx = await pack.getIndex();
        const found = this.fuzzyFind(name, idx.contents, "name", threshold);
        if(found.length>0) return pack.getDocument(found[0]._id);
      } catch(e){}
    }
    return null;
  }
};

// ── Panel ─────────────────────────────────────────────────────────────────────
class NpcForgePanel extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:"npc-forge-sidebar", title:"Jen's easy NPC",
      template:"modules/npc-forge/templates/sidebar.html",
      width:400, height:780, resizable:true
    });
  }

  _activeTab = "create";
  _npcParams = { gender:"", age:"normal", wealth:"normal", alignment:"", cr:0, selectedRaces:[], className:"" };
  _allSpecies = [];
  _allClasses = [];
  _allBackgrounds = [];
  _allPacks = [];
  _speciesFilter = "";

  async _loadAllData() {
    [this._allSpecies, this._allClasses, this._allBackgrounds, this._allPacks] = await Promise.all([
      NfSync.getAllSpecies(), NfSync.getAllClasses(), NfSync.getAllBackgrounds(), NfSync.getAllCompendiumPacks()
    ]);
  }

  async _renderInner(data) {
    await this._loadAllData();
    const lang = getLang();

    // Race DB entries
    let racesDb=[]; try{racesDb=JSON.parse(game.settings.get("npc-forge","raceDatabase"));}catch(e){}
    let classesDb=[]; try{classesDb=JSON.parse(game.settings.get("npc-forge","classDatabase"));}catch(e){}
    let bgsDb=[]; try{bgsDb=JSON.parse(game.settings.get("npc-forge","bgDatabase"));}catch(e){}

    // Settings values
    let savedKey="",savedItems="",savedSpells="",savedFuzzy=0.4;
    try{savedKey=game.settings.get("npc-forge","anthropicKey")||"";}catch(e){}
    try{savedItems=game.settings.get("npc-forge","itemsComp")||"";}catch(e){}
    try{savedSpells=game.settings.get("npc-forge","spellsComp")||"";}catch(e){}
    try{savedFuzzy=game.settings.get("npc-forge","fuzzyThreshold")||0.4;}catch(e){}

    // Build species filter list
    const filteredSpecies = this._speciesFilter
      ? NfSync.fuzzyFind(this._speciesFilter, this._allSpecies)
      : this._allSpecies;

    const speciesCheckboxes = filteredSpecies.map(s=>{
      const checked = this._npcParams.selectedRaces.includes(s.name);
      return `<label class="nf-race-cb ${checked?'checked':''}">
        <input type="checkbox" value="${s.name}" ${checked?'checked':''} data-source="${s.source}">
        <span class="nf-race-name">${s.name}</span>
        <span class="nf-race-src">${s.source}</span>
      </label>`;
    }).join("");

    // Build class options
    const classOptions = [`<option value="">${t("classNone")}</option>`];
    const seenClasses = new Set();
    // Known base classes first
    ["barbarian","bard","cleric","druid","fighter","monk","paladin","ranger","rogue","sorcerer","warlock","wizard"].forEach(c=>{
      const label = c.charAt(0).toUpperCase()+c.slice(1);
      classOptions.push(`<option value="${c}" ${this._npcParams.className===c?"selected":""}>${label}</option>`);
      seenClasses.add(c.toLowerCase());
    });
    // Custom + Foundry classes
    this._allClasses.forEach(c=>{
      if(!seenClasses.has(c.name.toLowerCase())) {
        seenClasses.add(c.name.toLowerCase());
        classOptions.push(`<option value="${c.name}" ${this._npcParams.className===c.name?"selected":""}>${c.name} <small>(${c.source})</small></option>`);
      }
    });

    // CR options
    const crOptions = NF_CR.list.map(cr=>`<option value="${cr}" ${this._npcParams.cr==cr?"selected":""}>${NF_CR.label(cr)}</option>`).join("");

    // Alignment options
    const alignments = [
      {v:"",l:t("gRandom")},{v:"lg",l:t("alignLG")},{v:"ng",l:t("alignNG")},{v:"cg",l:t("alignCG")},
      {v:"ln",l:t("alignLN")},{v:"n",l:t("alignN")},{v:"cn",l:t("alignCN")},
      {v:"le",l:t("alignLE")},{v:"ne",l:t("alignNE")},{v:"ce",l:t("alignCE")}
    ];
    const alignOptions = alignments.map(a=>`<option value="${a.v}" ${this._npcParams.alignment===a.v?"selected":""}>${a.l}</option>`).join("");

    // Pack options for settings
    const packOptions = (sel) => [`<option value="">-- Auto --</option>`,
      ...this._allPacks.map(p=>`<option value="${p.id}" ${sel===p.id?"selected":""}>${p.label}</option>`)
    ].join("");

    // Saved entries lists
    const makeEntryList = (db, editType) => db.length
      ? db.map(e=>`<div class="nf-entry" data-id="${e.id}">
          <div class="nf-entry-header">
            <span class="nf-entry-name">${e.name||"?"}</span>
            <span class="nf-entry-source ${e.isHomebrew?'homebrew':''}">${e.source||"Custom"}</span>
            <a class="nf-entry-link" href="#" data-id="${e.id}" data-type="${editType}" title="In Foundry öffnen">⧉</a>
            <button class="nf-entry-delete" data-id="${e.id}" data-type="${editType}">✕</button>
          </div>
          <div class="nf-entry-desc">${e.description?.substring(0,80)||""}</div>
        </div>`).join("")
      : `<div class="nf-empty">${editType==="race"?t("noRacesYet"):editType==="class"?t("noClassesYet"):t("noBgsYet")}</div>`;

    const selectedCount = this._npcParams.selectedRaces.length;
    const selectedLabel = selectedCount===0 ? t("searchRace") : `${selectedCount} Rasse(n) gewählt`;

    const html = `<div id="npc-forge-inner">
<style>
#npc-forge-inner{font-family:var(--font-primary);}
.nf-tabs{display:flex;gap:2px;padding:6px 6px 0;border-bottom:1px solid #ccc;flex-wrap:wrap;}
.nf-tab{flex:1;min-width:60px;padding:5px 3px;font-size:10px;text-align:center;cursor:pointer;border-radius:4px 4px 0 0;border:1px solid transparent;border-bottom:none;color:#888;background:transparent;}
.nf-tab.active{background:#fff;border-color:#ccc;color:#333;font-weight:600;}
.nf-panel{display:none;padding:8px;flex-direction:column;gap:5px;overflow-y:auto;max-height:660px;}
.nf-panel.active{display:flex;}
.nf-field{display:flex;flex-direction:column;gap:2px;}
.nf-field label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#888;}
.nf-field input,.nf-field textarea,.nf-field select{font-size:12px;padding:4px 6px;border:1px solid #ccc;border-radius:4px;width:100%;box-sizing:border-box;}
.nf-field textarea{resize:vertical;min-height:55px;font-family:inherit;}
.nf-chips{display:flex;gap:3px;flex-wrap:wrap;}
.nf-chip{padding:3px 7px;font-size:11px;border-radius:3px;border:1px solid #ccc;background:#f5f5f5;cursor:pointer;color:#666;}
.nf-chip.selected{background:#6b5acd;border-color:transparent;color:#fff;}
.nf-btn{width:100%;padding:8px;font-size:12px;font-weight:600;background:#6b5acd;color:#fff;border:none;border-radius:5px;cursor:pointer;margin-top:2px;}
.nf-btn:hover{opacity:0.88;} .nf-btn:disabled{opacity:0.4;cursor:not-allowed;}
.nf-btn-sm{padding:5px 10px;font-size:11px;font-weight:600;background:#6b5acd;color:#fff;border:none;border-radius:4px;cursor:pointer;width:auto;}
.nf-status{font-size:11px;text-align:center;padding:5px;border-radius:4px;display:none;margin-top:3px;}
.nf-status.running{color:#c8a44a;background:rgba(200,164,74,0.1);display:block;}
.nf-status.success{color:#4caf78;background:rgba(76,175,120,0.1);display:block;}
.nf-status.error{color:#e05252;background:rgba(224,82,82,0.1);display:block;}

/* Race Excel-Filter */
.nf-race-filter{position:relative;}
.nf-race-trigger{display:flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #ccc;border-radius:4px;cursor:pointer;background:#fff;font-size:12px;min-height:28px;}
.nf-race-trigger:hover{border-color:#6b5acd;}
.nf-race-dropdown{position:absolute;top:100%;left:0;right:0;z-index:9999;background:#fff;border:1px solid #ccc;border-radius:4px;box-shadow:0 4px 16px rgba(0,0,0,0.2);display:none;max-height:260px;flex-direction:column;}
.nf-race-dropdown.open{display:flex;}
.nf-race-search-row{padding:6px;border-bottom:1px solid #eee;display:flex;gap:4px;align-items:center;}
.nf-race-search-row input{flex:1;padding:3px 6px;border:1px solid #ccc;border-radius:3px;font-size:11px;}
.nf-race-search-row button{padding:2px 6px;font-size:10px;border:1px solid #ccc;border-radius:3px;cursor:pointer;background:#f5f5f5;}
.nf-race-list{overflow-y:auto;flex:1;padding:4px;}
.nf-race-cb{display:flex;align-items:center;gap:6px;padding:3px 4px;cursor:pointer;border-radius:3px;font-size:11px;}
.nf-race-cb:hover{background:#f0f0f0;}
.nf-race-cb.checked{background:#f0eeff;}
.nf-race-cb input{cursor:pointer;margin:0;}
.nf-race-name{flex:1;font-weight:500;}
.nf-race-src{font-size:9px;color:#999;padding:1px 4px;background:#f5f5f5;border-radius:2px;}
.nf-race-actions{padding:6px;border-top:1px solid #eee;display:flex;gap:4px;justify-content:flex-end;}

/* Entry list */
.nf-entry{background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;padding:5px 8px;margin-bottom:3px;}
.nf-entry-header{display:flex;align-items:center;gap:5px;}
.nf-entry-name{font-size:12px;font-weight:600;flex:1;}
.nf-entry-source{font-size:9px;padding:1px 4px;border-radius:3px;background:#eee;color:#888;}
.nf-entry-source.homebrew{background:rgba(180,100,20,0.15);color:#b46414;}
.nf-entry-link{font-size:12px;color:#6b5acd;text-decoration:none;padding:0 3px;}
.nf-entry-delete{background:none;border:none;cursor:pointer;color:#ccc;font-size:11px;padding:0 2px;}
.nf-entry-delete:hover{color:#e05252;}
.nf-entry-desc{font-size:10px;color:#999;margin-top:2px;}
.nf-sep{font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#888;padding-bottom:3px;border-bottom:1px solid #eee;margin-top:4px;}
.nf-empty{text-align:center;color:#888;font-size:11px;padding:10px 0;}
.nf-row{display:flex;gap:6px;}
.nf-row .nf-field{flex:1;}
</style>

<div class="nf-tabs">
  <button class="nf-tab ${this._activeTab==="create"?"active":""}" data-tab="create">${t("tabCreate")}</button>
  <button class="nf-tab ${this._activeTab==="races"?"active":""}" data-tab="races">${t("tabRaces")}</button>
  <button class="nf-tab ${this._activeTab==="classes"?"active":""}" data-tab="classes">${t("tabClasses")}</button>
  <button class="nf-tab ${this._activeTab==="backgrounds"?"active":""}" data-tab="backgrounds">${t("tabBackgrounds")}</button>
  <button class="nf-tab ${this._activeTab==="settings"?"active":""}" data-tab="settings">${t("tabSettings")}</button>
</div>

<!-- CREATE TAB -->
<div class="nf-panel ${this._activeTab==="create"?"active":""}" data-tab="create">
  <div class="nf-field">
    <label>${t("labelName")} <span style="opacity:.5;font-weight:normal">(${t("optional")})</span></label>
    <input type="text" id="nf-name" placeholder="${t("namePlaceholder")}" value="${this._npcParams.customName||""}">
  </div>

  <div class="nf-field">
    <label>${t("labelRace")} <span style="opacity:.5;font-weight:normal">(${t("optional")})</span></label>
    <div class="nf-race-filter">
      <div class="nf-race-trigger" id="nf-race-trigger">
        <span id="nf-race-trigger-label">${selectedLabel}</span>
        <span style="margin-left:auto;opacity:.5">▾</span>
      </div>
      <div class="nf-race-dropdown" id="nf-race-dropdown">
        <div class="nf-race-search-row">
          <input type="text" id="nf-race-search" placeholder="${t("searchRace")}">
          <button id="nf-race-all">${t("selectAll")}</button>
          <button id="nf-race-none">${t("selectNone")}</button>
        </div>
        <div class="nf-race-list" id="nf-race-list">${speciesCheckboxes||'<div class="nf-empty">Lade Rassen...</div>'}</div>
        <div class="nf-race-actions">
          <button class="nf-btn-sm" id="nf-race-close">OK</button>
        </div>
      </div>
    </div>
  </div>

  <div class="nf-row">
    <div class="nf-field">
      <label>${t("labelClass")}</label>
      <select id="nf-class">${classOptions.join("")}</select>
    </div>
    <div class="nf-field" style="max-width:80px">
      <label>${t("labelCR")}</label>
      <select id="nf-cr">${crOptions}</select>
    </div>
  </div>

  <div class="nf-field">
    <label>${t("labelAlignment")}</label>
    <select id="nf-alignment">${alignOptions}</select>
  </div>

  <div class="nf-field">
    <label>${t("labelGender")}</label>
    <div class="nf-chips">
      <span class="nf-chip ${!this._npcParams.gender?"selected":""}" data-group="gender" data-value="">${t("gRandom")}</span>
      <span class="nf-chip ${this._npcParams.gender==="male"?"selected":""}" data-group="gender" data-value="male">${t("gMale")}</span>
      <span class="nf-chip ${this._npcParams.gender==="female"?"selected":""}" data-group="gender" data-value="female">${t("gFemale")}</span>
      <span class="nf-chip ${this._npcParams.gender==="non-binary"?"selected":""}" data-group="gender" data-value="non-binary">${t("gNonBinary")}</span>
    </div>
  </div>

  <div class="nf-row">
    <div class="nf-field">
      <label>${t("labelAge")}</label>
      <div class="nf-chips">
        <span class="nf-chip ${this._npcParams.age==="young"?"selected":""}" data-group="age" data-value="young">${t("aYoung")}</span>
        <span class="nf-chip ${this._npcParams.age==="normal"?"selected":""}" data-group="age" data-value="normal">${t("aNormal")}</span>
        <span class="nf-chip ${this._npcParams.age==="old"?"selected":""}" data-group="age" data-value="old">${t("aOld")}</span>
      </div>
    </div>
    <div class="nf-field">
      <label>${t("labelWealth")}</label>
      <div class="nf-chips">
        <span class="nf-chip ${this._npcParams.wealth==="poor"?"selected":""}" data-group="wealth" data-value="poor">${t("wPoor")}</span>
        <span class="nf-chip ${this._npcParams.wealth==="normal"?"selected":""}" data-group="wealth" data-value="normal">${t("wNormal")}</span>
        <span class="nf-chip ${this._npcParams.wealth==="noble"?"selected":""}" data-group="wealth" data-value="noble">${t("wNoble")}</span>
      </div>
    </div>
  </div>

  <div class="nf-field">
    <label>${t("labelWish")} <span style="opacity:.5;font-weight:normal">(${t("optional")})</span></label>
    <textarea id="nf-special-wish" placeholder="${t("wishPlaceholder")}">${this._npcParams.wish||""}</textarea>
  </div>
  <div class="nf-status" id="nf-create-status"></div>
  <button class="nf-btn nf-generate-btn">${t("btnGenerate")}</button>
</div>

<!-- RACES TAB -->
<div class="nf-panel ${this._activeTab==="races"?"active":""}" data-tab="races">
  <div class="nf-field">
    <label>${t("pasteDesc")}</label>
    <textarea class="nf-import-textarea" rows="5" placeholder="Paste race/species description..."></textarea>
    <button class="nf-btn nf-import-btn" data-type="race" style="margin-top:4px">${t("importRace")}</button>
  </div>
  <div class="nf-status" id="nf-races-status"></div>
  <div class="nf-sep">${t("savedEntries", racesDb.length)}</div>
  ${makeEntryList(racesDb,"race")}
</div>

<!-- CLASSES TAB -->
<div class="nf-panel ${this._activeTab==="classes"?"active":""}" data-tab="classes">
  <div class="nf-field">
    <label>${t("pasteDesc")}</label>
    <textarea class="nf-import-textarea" rows="5" placeholder="Paste class/subclass description..."></textarea>
    <button class="nf-btn nf-import-btn" data-type="class" style="margin-top:4px">${t("importClass")}</button>
  </div>
  <div class="nf-status" id="nf-classes-status"></div>
  <div class="nf-sep">${t("savedEntries", classesDb.length)}</div>
  ${makeEntryList(classesDb,"class")}
</div>

<!-- BACKGROUNDS TAB -->
<div class="nf-panel ${this._activeTab==="backgrounds"?"active":""}" data-tab="backgrounds">
  <div class="nf-field">
    <label>${t("pasteDesc")}</label>
    <textarea class="nf-import-textarea" rows="5" placeholder="Paste background description..."></textarea>
    <button class="nf-btn nf-import-btn" data-type="background" style="margin-top:4px">${t("importBg")}</button>
  </div>
  <div class="nf-status" id="nf-bgs-status"></div>
  <div class="nf-sep">${t("savedEntries", bgsDb.length)}</div>
  ${makeEntryList(bgsDb,"background")}
</div>

<!-- SETTINGS TAB -->
<div class="nf-panel ${this._activeTab==="settings"?"active":""}" data-tab="settings">
  <div class="nf-field">
    <label>API Key (Anthropic / OpenRouter)</label>
    <input type="password" id="nf-api-key" placeholder="sk-ant-... or sk-or-..." value="${savedKey}">
  </div>
  <div class="nf-field">
    <label>${t("labelItemsComp")}</label>
    <select id="nf-items-comp">${packOptions(savedItems)}</select>
  </div>
  <div class="nf-field">
    <label>${t("labelSpellsComp")}</label>
    <select id="nf-spells-comp">${packOptions(savedSpells)}</select>
  </div>
  <div class="nf-field">
    <label>${t("labelFuzzy")}: <span id="nf-fuzzy-val">${savedFuzzy}</span></label>
    <input type="range" id="nf-fuzzy" min="0.1" max="0.9" step="0.1" value="${savedFuzzy}">
  </div>
  <button class="nf-btn" id="nf-save-settings" style="margin-top:8px">${t("btnSaveSettings")}</button>
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

    // Tabs
    root.querySelectorAll(".nf-tab").forEach(tab=>tab.addEventListener("click",e=>{
      this._activeTab = e.currentTarget.dataset.tab;
      root.querySelectorAll(".nf-tab").forEach(t=>t.classList.remove("active"));
      root.querySelectorAll(".nf-panel").forEach(p=>p.classList.remove("active"));
      e.currentTarget.classList.add("active");
      root.querySelector(`.nf-panel[data-tab="${this._activeTab}"]`)?.classList.add("active");
    }));

    // Chips
    root.querySelectorAll(".nf-chip").forEach(chip=>chip.addEventListener("click",e=>{
      const group = e.currentTarget.dataset.group;
      root.querySelectorAll(`.nf-chip[data-group="${group}"]`).forEach(c=>c.classList.remove("selected"));
      e.currentTarget.classList.add("selected");
      this._npcParams[group] = e.currentTarget.dataset.value;
    }));

    // CR / Class / Alignment
    root.querySelector("#nf-class")?.addEventListener("change",e=>this._npcParams.className=e.target.value);
    root.querySelector("#nf-cr")?.addEventListener("change",e=>this._npcParams.cr=parseFloat(e.target.value)||0);
    root.querySelector("#nf-alignment")?.addEventListener("change",e=>this._npcParams.alignment=e.target.value);

    // Race Excel filter
    const trigger = root.querySelector("#nf-race-trigger");
    const dropdown = root.querySelector("#nf-race-dropdown");
    trigger?.addEventListener("click",e=>{ e.stopPropagation(); dropdown.classList.toggle("open"); });
    root.querySelector("#nf-race-close")?.addEventListener("click",()=>dropdown.classList.remove("open"));
    document.addEventListener("click",e=>{ if(!root.querySelector(".nf-race-filter")?.contains(e.target)) dropdown?.classList.remove("open"); });

    root.querySelector("#nf-race-search")?.addEventListener("input",e=>{
      this._speciesFilter = e.target.value;
      this._updateRaceList(root);
    });
    root.querySelector("#nf-race-all")?.addEventListener("click",()=>{
      this._npcParams.selectedRaces = this._allSpecies.map(s=>s.name);
      this._updateRaceList(root); this._updateRaceTrigger(root);
    });
    root.querySelector("#nf-race-none")?.addEventListener("click",()=>{
      this._npcParams.selectedRaces = [];
      this._updateRaceList(root); this._updateRaceTrigger(root);
    });
    root.querySelector("#nf-race-list")?.addEventListener("change",e=>{
      const cb = e.target.closest("input[type=checkbox]");
      if(!cb) return;
      const name = cb.value;
      if(cb.checked) { if(!this._npcParams.selectedRaces.includes(name)) this._npcParams.selectedRaces.push(name); }
      else this._npcParams.selectedRaces = this._npcParams.selectedRaces.filter(r=>r!==name);
      cb.closest(".nf-race-cb")?.classList.toggle("checked",cb.checked);
      this._updateRaceTrigger(root);
    });

    // Fuzzy slider
    root.querySelector("#nf-fuzzy")?.addEventListener("input",e=>{
      root.querySelector("#nf-fuzzy-val").textContent = e.target.value;
    });

    // Generate
    root.querySelector(".nf-generate-btn")?.addEventListener("click",()=>this._generateNPC(root));

    // Import buttons
    root.querySelectorAll(".nf-import-btn").forEach(btn=>btn.addEventListener("click",async e=>{
      const type = e.currentTarget.dataset.type;
      const panel = e.currentTarget.closest(".nf-panel");
      const text = panel?.querySelector(".nf-import-textarea")?.value?.trim();
      if(text) await this._importEntry(text, type, root);
    }));

    // Delete entries
    root.querySelectorAll(".nf-entry-delete").forEach(btn=>btn.addEventListener("click",async e=>{
      const {id,type} = e.currentTarget.dataset;
      await this._deleteEntry(id, type);
      this.render();
    }));

    // Entry links (open in Foundry)
    root.querySelectorAll(".nf-entry-link").forEach(a=>a.addEventListener("click",async e=>{
      e.preventDefault();
      const {id,type} = e.currentTarget.dataset;
      const dbKey = type==="race"?"raceDatabase":type==="class"?"classDatabase":"bgDatabase";
      let db=[]; try{db=JSON.parse(game.settings.get("npc-forge",dbKey));}catch(er){}
      const entry = db.find(x=>x.id===id);
      if(entry?.foundryId) {
        const item = game.items.get(entry.foundryId);
        if(item) item.sheet.render(true);
      }
    }));

    // Settings save
    root.querySelector("#nf-save-settings")?.addEventListener("click",async()=>{
      const k=root.querySelector("#nf-api-key")?.value;
      const ic=root.querySelector("#nf-items-comp")?.value;
      const sc=root.querySelector("#nf-spells-comp")?.value;
      const fz=parseFloat(root.querySelector("#nf-fuzzy")?.value)||0.4;
      if(k) await game.settings.set("npc-forge","anthropicKey",k);
      await game.settings.set("npc-forge","itemsComp",ic);
      await game.settings.set("npc-forge","spellsComp",sc);
      await game.settings.set("npc-forge","fuzzyThreshold",fz);
      this._setStatus(root,t("settingsSaved"),"success","nf-settings-status");
    });
  }

  _updateRaceList(root) {
    const filtered = this._speciesFilter
      ? NfSync.fuzzyFind(this._speciesFilter, this._allSpecies)
      : this._allSpecies;
    const html = filtered.map(s=>{
      const checked = this._npcParams.selectedRaces.includes(s.name);
      return `<label class="nf-race-cb ${checked?'checked':''}">
        <input type="checkbox" value="${s.name}" ${checked?'checked':''} data-source="${s.source}">
        <span class="nf-race-name">${s.name}</span>
        <span class="nf-race-src">${s.source}</span>
      </label>`;
    }).join("") || `<div class="nf-empty">Keine Rassen gefunden</div>`;
    const list = root.querySelector("#nf-race-list");
    if(list) list.innerHTML = html;
    // Re-attach change listeners
    root.querySelector("#nf-race-list")?.querySelectorAll("input[type=checkbox]").forEach(cb=>{
      cb.addEventListener("change",e=>{
        const name = e.target.value;
        if(e.target.checked){ if(!this._npcParams.selectedRaces.includes(name)) this._npcParams.selectedRaces.push(name); }
        else this._npcParams.selectedRaces = this._npcParams.selectedRaces.filter(r=>r!==name);
        e.target.closest(".nf-race-cb")?.classList.toggle("checked",e.target.checked);
        this._updateRaceTrigger(root);
      });
    });
  }

  _updateRaceTrigger(root) {
    const n = this._npcParams.selectedRaces.length;
    const label = n===0 ? t("searchRace") : `${n} Rasse(n): ${this._npcParams.selectedRaces.slice(0,2).join(", ")}${n>2?"...":""}`;
    const el = root.querySelector("#nf-race-trigger-label");
    if(el) el.textContent = label;
  }

  async _importEntry(text, type, root) {
    const statusId = type==="race"?"nf-races-status":type==="class"?"nf-classes-status":"nf-bgs-status";
    this._setStatus(root,"Analysiere mit KI...","running",statusId);
    try {
      const systemPrompt = type==="race"
        ? "Extract D&D 5e species/race data. Return ONLY valid JSON."
        : type==="class"
        ? "Extract D&D 5e class/subclass data. Return ONLY valid JSON."
        : "Extract D&D 5e background data. Return ONLY valid JSON.";

      const fields = type==="race"
        ? `{"name":"","source":"","description":"","traits":{"size":"med","speed":{"walk":30,"swim":0,"fly":0},"darkvision":0,"languages":[],"abilityScoreIncreases":""},"appearance":{"skinColors":[],"eyeColors":[],"distinctiveFeatures":[]},"names":{"examples":[],"naming_conventions":""}}`
        : type==="class"
        ? `{"name":"","source":"","description":"","spellcasting":"","saves":[],"skills":{"pool":[],"max":2},"proficiencies":[]}`
        : `{"name":"","source":"","description":"","skillProficiencies":[],"languages":[],"equipment":[],"feature":""}`;

      const raw = await this._callClaude(systemPrompt,
        `Extract data from this ${type} description and return ONLY JSON matching this structure:\n${fields}\n\nDescription:\n${text}`, 1500);
      const data = JSON.parse(raw.replace(/```json|```/g,"").trim());
      data.id = foundry.utils.randomID();
      data.isHomebrew = true;

      // Sync to Foundry Items
      this._setStatus(root,t("syncing"),"running",statusId);
      const folderName = type==="race"?"Species":type==="class"?"Classes":"Backgrounds";
      const itemType = type==="race"?"species":type==="class"?"class":"background";
      const foundryItem = await NfSync.syncToFoundry(data, folderName, itemType);
      if(foundryItem) data.foundryId = foundryItem.id;

      // Save to DB
      const dbKey = type==="race"?"raceDatabase":type==="class"?"classDatabase":"bgDatabase";
      let db=[]; try{db=JSON.parse(game.settings.get("npc-forge",dbKey));}catch(e){}
      db.push(data);
      await game.settings.set("npc-forge",dbKey,JSON.stringify(db));

      this._setStatus(root,`✓ "${data.name}" importiert!`,"success",statusId);
      this.render();
    } catch(e) { this._setStatus(root,`Fehler: ${e.message}`,"error",statusId); }
  }

  async _deleteEntry(id, type) {
    const dbKey = type==="race"?"raceDatabase":type==="class"?"classDatabase":"bgDatabase";
    let db=[]; try{db=JSON.parse(game.settings.get("npc-forge",dbKey));}catch(e){}
    await game.settings.set("npc-forge",dbKey,JSON.stringify(db.filter(x=>x.id!==id)));
  }

  async _callClaude(system, user, maxTokens=2500) {
    const apiKey = game.settings.get("npc-forge","anthropicKey");
    if(!apiKey) throw new Error(t("errorNoKey"));
    const isOR = apiKey.startsWith("sk-or-");
    let resp;
    if(isOR) {
      resp = await fetch("https://openrouter.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`,"HTTP-Referer":"https://github.com/MrsPein/jens-easy-npc","X-Title":"Jen's easy NPC"},
        body:JSON.stringify({model:"anthropic/claude-sonnet-4-5",max_tokens:maxTokens,messages:[{role:"system",content:system},{role:"user",content:user}]})
      });
    } else {
      resp = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages:[{role:"user",content:user}]})
      });
    }
    if(!resp.ok){const e=await resp.json().catch(()=>({}));throw new Error(`API ${resp.status}: ${e?.error?.message||resp.statusText}`);}
    const d=await resp.json();
    return isOR?d.choices?.[0]?.message?.content:d.content?.[0]?.text;
  }

  async _generateNPC(root) {
    const btn = root.querySelector(".nf-generate-btn");
    if(btn) btn.disabled=true;
    try {
      const lang = getLang();
      const outputLang = t("outputLang");
      const customName = root.querySelector("#nf-name")?.value?.trim()||null;
      const wish = root.querySelector("#nf-special-wish")?.value?.trim()||null;
      const className = this._npcParams.className||"";
      const cr = parseFloat(root.querySelector("#nf-cr")?.value||"0")||0;
      const wealth = this._npcParams.wealth||"normal";
      const age = this._npcParams.age||"normal";
      const gender = this._npcParams.gender||null;
      const alignment = this._npcParams.alignment||null;
      const selectedRaces = this._npcParams.selectedRaces||[];
      const fuzzy = game.settings.get("npc-forge","fuzzyThreshold")||0.4;

      this._setStatus(root,t("step1"),"running","nf-create-status");

      // Get race profile
      let raceProfile = null;
      let raceName = null;
      if(selectedRaces.length>0) {
        raceName = selectedRaces[Math.floor(Math.random()*selectedRaces.length)];
        // Find in our DB first
        let racesDb=[]; try{racesDb=JSON.parse(game.settings.get("npc-forge","raceDatabase"));}catch(e){}
        raceProfile = racesDb.find(r=>r.name===raceName);
      }

      // Get background profile
      let bgProfile = null;
      let bgsDb=[]; try{bgsDb=JSON.parse(game.settings.get("npc-forge","bgDatabase"));}catch(e){}
      if(bgsDb.length>0) bgProfile = bgsDb[Math.floor(Math.random()*bgsDb.length)];

      // Build race description for prompt
      const raceDesc = raceProfile
        ? `Race/Species: ${raceProfile.name}. ${raceProfile.description?.substring(0,200)||""}. Appearance: ${(raceProfile.appearance?.distinctiveFeatures||[]).join(", ")||"humanoid features"}. Naming: ${raceProfile.names?.naming_conventions||"fantasy"}. Name examples: ${(raceProfile.names?.examples||[]).slice(0,5).join(", ")||"none"}.`
        : raceName
        ? `Race/Species: ${raceName}.`
        : "Race: Human.";

      // Determine class key for stats
      const classKey = NF_CR.skillsForClass[className?.toLowerCase()] ? className.toLowerCase() : "commoner";
      const saves = NF_CR.savesForClass[classKey]||[];
      const skillPool = NF_CR.skillsForClass[classKey]||NF_CR.skillsForClass.commoner;
      const spellcasting = NF_CR.spellcastingForClass[classKey]||null;

      // Name seeds
      const seeds=["Vorlan","Thisbe","Kreth","Umara","Belwick","Saoirse","Dravix","Fennick","Zorath","Lirien","Casmyr","Ondra","Brix","Tessavel","Gorruk","Maeven","Ydrel","Skarix","Nunna","Pholt"];
      const styles=["one syllable blunt","two syllables earthy","two syllables exotic","three syllables noble","unusual consonant cluster","ends in vowel melodic","starts with rare letter","sounds like nickname","compound of two roots"];
      const nameSeed=seeds[Math.floor(Math.random()*seeds.length)];
      const nameStyle=styles[Math.floor(Math.random()*styles.length)];

      const wMap={poor:lang==="de"?"arm, zerlumpt":"poor, ragged",modest:lang==="de"?"bescheiden":"modest",normal:lang==="de"?"normal":"normal",wealthy:lang==="de"?"wohlhabend, feine Kleidung":"wealthy, fine clothing",noble:lang==="de"?"adelig, luxuriös":"noble, luxurious"};
      const aMap={young:lang==="de"?"jung (Teenager-20er)":"young (teens-20s)",normal:lang==="de"?"mittleres Alter (30er-50er)":"middle-aged (30s-50s)",old:lang==="de"?"alt (60er+)":"old (60s+)"};
      const alignMap={lg:"Lawful Good",ng:"Neutral Good",cg:"Chaotic Good",ln:"Lawful Neutral",n:"Neutral",cn:"Chaotic Neutral",le:"Lawful Evil",ne:"Neutral Evil",ce:"Chaotic Evil"};

      const prompt = `Generate a D&D 5e NPC. Return ONLY valid JSON, no markdown.
OUTPUT LANGUAGE: ${outputLang}. ALL text fields MUST be in ${outputLang}.

${raceDesc}
${bgProfile?`Background: ${bgProfile.name}. ${bgProfile.description?.substring(0,100)||""}.`:""}
Class/Role: ${className||"commoner without class"}
CR: ${NF_CR.label(cr)}
Gender: ${gender||(lang==="de"?"zufällig":"random")}
Age: ${aMap[age]||age}
Wealth: ${wMap[wealth]||wealth}
Alignment: ${alignment?alignMap[alignment]||alignment:(lang==="de"?"zufällig":"random")}
${wish?`Special personal wishes (integrate into backstory, appearance, occupation): ${wish}`:""}

${customName?`NAME: Use exactly this name: "${customName}"`:`NAME RULES: Create a unique name with first AND last name. Style: ${nameStyle}. Sound inspiration (do NOT copy): "${nameSeed}". FORBIDDEN: Aldric, Mira, Gareth, Elena, Theron, Sera, Lyra, Vane, Aria, Kael, Zara, Drake, Storm, Silver. ${lang==="de"?"German-style phonetics welcome (Schimmer, Fluss, Glut etc.)":""}`}

Return this JSON structure exactly:
{
  "name":"",
  "race":"",
  "class":"",
  "occupation":"",
  "background":"",
  "gender":"",
  "age":"",
  "alignment":"",
  "personality":[],
  "ideal":"","bond":"","flaw":"",
  "appearance":{"height":"","build":"","skinColor":"","eyeColor":"","hairOrFeatures":"","clothing":"","distinguishingFeatures":""},
  "stats":{"CR":${cr},"HP":0,"AC":0,"STR":10,"DEX":10,"CON":10,"INT":10,"WIS":10,"CHA":10,"speed":30,"skills":[],"languages":[]},
  "equipment":[],
  "spells":[],
  "backstory":"",
  "portraitPrompt":""
}`;

      const raw = await this._callClaude(`You are a D&D 5e NPC generator. Return only valid JSON. All text in ${outputLang}.`, prompt, 2800);
      const npcData = JSON.parse(raw.replace(/```json|```/g,"").trim());

      // Calculate stats from CR
      this._setStatus(root,t("step2"),"running","nf-create-status");
      const baseAbilities = {str:npcData.stats?.STR||10,dex:npcData.stats?.DEX||10,con:npcData.stats?.CON||10,int:npcData.stats?.INT||10,wis:npcData.stats?.WIS||10,cha:npcData.stats?.CHA||10};
      const scaledAbilities = NF_CR.scaleAbilities(baseAbilities, cr, saves);
      const hp = NF_CR.getAvgHP(cr);
      const ac = NF_CR.getAC(cr);
      const profBonus = NF_CR.getProfBonus(cr);

      // Skills from class
      const numSkills = classKey==="rogue"?4:classKey==="bard"?3:2;
      const shuffled = [...skillPool].sort(()=>Math.random()-0.5);
      const chosenSkills = shuffled.slice(0,numSkills);
      const skills = {};
      chosenSkills.forEach(s=>{ skills[s]={value:1}; });

      // Size + movement from race profile
      const raceSize = raceProfile?.traits?.size||"med";
      const raceSpeed = raceProfile?.traits?.speed?.walk||30;
      const raceDarkvision = raceProfile?.traits?.darkvision||0;
      const raceLanguages = raceProfile?.traits?.languages||["common"];

      // Languages: merge race + generated
      const allLangs = [...new Set([...raceLanguages,...(npcData.stats?.languages||[])])];

      // Load items + spells
      const itemsCompId = game.settings.get("npc-forge","itemsComp")||"";
      const spellsCompId = game.settings.get("npc-forge","spellsComp")||"";

      // Determine items to search for
      const itemsToLoad = npcData.equipment?.length>0 ? npcData.equipment : this._getDefaultItems(classKey,wealth);
      const spellsToLoad = spellcasting&&npcData.spells?.length>0 ? npcData.spells : (spellcasting?this._getDefaultSpells(classKey,cr):[]);

      const loadedItems = [];
      for(const itemName of itemsToLoad.slice(0,6)) {
        try {
          const item = await NfSync.findItemInFoundry(itemName, itemsCompId, fuzzy);
          if(item) { loadedItems.push(item.toObject()); console.log("NPC Forge | loaded item:", itemName); }
          else console.warn("NPC Forge | item not found in any pack:", itemName);
        } catch(e){ console.warn("NPC Forge | item error:",itemName, e.message); }
      }
      const loadedSpells = [];
      for(const spellName of spellsToLoad.slice(0,8)) {
        try {
          const spell = await NfSync.findItemInFoundry(spellName, spellsCompId, fuzzy);
          if(spell) { loadedSpells.push(spell.toObject()); console.log("NPC Forge | loaded spell:", spellName); }
          else console.warn("NPC Forge | spell not found in any pack:", spellName);
        } catch(e){ console.warn("NPC Forge | spell error:",spellName, e.message); }
      }

      this._setStatus(root,t("step3"),"running","nf-create-status");

      // Build biography
      const bio = `<p>${npcData.backstory||""}</p>
<p><b>${lang==="de"?"Beruf":"Occupation"}:</b> ${npcData.occupation||""}</p>
<p><b>${lang==="de"?"Ideal":"Ideal"}:</b> ${npcData.ideal||""} &nbsp;|&nbsp; <b>${lang==="de"?"Bindung":"Bond"}:</b> ${npcData.bond||""} &nbsp;|&nbsp; <b>${lang==="de"?"Schwäche":"Flaw"}:</b> ${npcData.flaw||""}</p>
${npcData.appearance?`<p><b>${lang==="de"?"Aussehen":"Appearance"}:</b> ${npcData.appearance.height||""}, ${npcData.appearance.build||""}, ${npcData.appearance.skinColor||""}, ${npcData.appearance.eyeColor||""} ${lang==="de"?"Augen":"eyes"}. ${npcData.appearance.distinguishingFeatures||""}</p><p><b>${lang==="de"?"Kleidung":"Clothing"}:</b> ${npcData.appearance.clothing||""}</p>`:""}
${npcData.personality?.length?`<p><b>${lang==="de"?"Persönlichkeit":"Personality"}:</b> ${npcData.personality.join(", ")}</p>`:""}`;

      // Alignment string
      const alignStr = npcData.alignment||"";

      // Currency based on wealth
      const currencyMap = {
        poor:{cp:Math.floor(Math.random()*20),sp:Math.floor(Math.random()*5),gp:0,ep:0,pp:0},
        modest:{cp:0,sp:Math.floor(Math.random()*20)+5,gp:Math.floor(Math.random()*3),ep:0,pp:0},
        normal:{cp:0,sp:Math.floor(Math.random()*10),gp:Math.floor(Math.random()*10)+2,ep:0,pp:0},
        wealthy:{cp:0,sp:0,gp:Math.floor(Math.random()*50)+20,ep:Math.floor(Math.random()*5),pp:0},
        noble:{cp:0,sp:0,gp:Math.floor(Math.random()*200)+100,ep:0,pp:Math.floor(Math.random()*10)+2}
      };
      const currency = currencyMap[wealth]||currencyMap.normal;

      const actor = await Actor.create({
        name: npcData.name, type:"npc", img:"icons/svg/mystery-man.svg",
        system:{
          details:{
            biography:{value:bio},
            race:npcData.race||raceName||"",
            background:npcData.background||"",
            alignment:alignStr,
            cr:cr,
            source:"Jen's easy NPC",
            type:{value:"humanoid",custom:npcData.race||raceName||""}
          },
          attributes:{
            hp:{value:hp,max:hp},
            ac:{flat:ac},
            movement:{walk:raceSpeed},
            senses:{darkvision:raceDarkvision}
          },
          abilities:{
            str:{value:scaledAbilities.str?.value||10,proficient:scaledAbilities.str?.proficient||0},
            dex:{value:scaledAbilities.dex?.value||10,proficient:scaledAbilities.dex?.proficient||0},
            con:{value:scaledAbilities.con?.value||10,proficient:scaledAbilities.con?.proficient||0},
            int:{value:scaledAbilities.int?.value||10,proficient:scaledAbilities.int?.proficient||0},
            wis:{value:scaledAbilities.wis?.value||10,proficient:scaledAbilities.wis?.proficient||0},
            cha:{value:scaledAbilities.cha?.value||10,proficient:scaledAbilities.cha?.proficient||0}
          },
          skills: skills,
          traits:{
            size:raceSize,
            languages:{value:allLangs}
          },
          currency:currency,
          ...(spellcasting?{attributes:{spellcasting}}:{})
        }
      });

      // Add items + spells
      const allItems = [...loadedItems,...loadedSpells];
      if(allItems.length>0) {
        await actor.createEmbeddedDocuments("Item", allItems, {});
      }

      actor.sheet.render(true);
      this._setStatus(root, t("done",npcData.name), "success","nf-create-status");
    } catch(e) {
      console.error("NPC Forge:",e);
      this._setStatus(root,`Fehler: ${e.message}`,"error","nf-create-status");
    } finally {
      if(btn) btn.disabled=false;
    }
  }

  _getDefaultItems(classKey, wealth) {
    const byClass = {
      barbarian:["Greataxe","Handaxe","Explorer's Pack"],
      bard:["Rapier","Lute","Entertainer's Pack","Leather Armor"],
      cleric:["Mace","Shield","Chain Mail","Holy Symbol","Priest's Pack"],
      druid:["Quarterstaff","Leather Armor","Druidic Focus","Explorer's Pack"],
      fighter:["Longsword","Shield","Chain Mail","Light Crossbow"],
      monk:["Shortsword","Explorer's Pack"],
      paladin:["Longsword","Shield","Chain Mail","Holy Symbol"],
      ranger:["Longbow","Shortsword","Leather Armor","Explorer's Pack"],
      rogue:["Rapier","Shortbow","Leather Armor","Thieves' Tools","Burglar's Pack"],
      sorcerer:["Light Crossbow","Arcane Focus","Dungeoneer's Pack"],
      warlock:["Light Crossbow","Arcane Focus","Scholar's Pack","Leather Armor"],
      wizard:["Quarterstaff","Spellbook","Scholar's Pack","Arcane Focus"],
      commoner:["Dagger","Common Clothes","Belt Pouch"]
    };
    const wealthItems={noble:["Fine Clothes","Signet Ring"],wealthy:["Traveler's Clothes"],poor:[]};
    return [...(byClass[classKey]||byClass.commoner),...(wealthItems[wealth]||[])];
  }

  _getDefaultSpells(classKey, cr) {
    const byClass = {
      wizard:["Fire Bolt","Mage Armor","Magic Missile","Shield","Fireball","Counterspell"],
      sorcerer:["Fire Bolt","Mage Armor","Magic Missile","Thunderwave","Fireball"],
      warlock:["Eldritch Blast","Armor of Agathys","Hunger of Hadar","Hex"],
      cleric:["Sacred Flame","Cure Wounds","Bless","Guiding Bolt","Spiritual Weapon","Healing Word"],
      druid:["Shillelagh","Healing Word","Entangle","Moonbeam","Call Lightning"],
      bard:["Vicious Mockery","Healing Word","Thunderwave","Hypnotic Pattern","Suggestion"],
      paladin:["Bless","Cure Wounds","Divine Smite","Shield of Faith"],
      ranger:["Hunter's Mark","Cure Wounds","Spike Growth"],
      monk:["Stunning Strike"]
    };
    const spells = byClass[classKey]||[];
    const maxSpells = cr<=1?2:cr<=5?4:6;
    return spells.slice(0,maxSpells);
  }

  _setStatus(root, text, type, statusId) {
    let el = statusId ? root.querySelector(`#${statusId}`) : root.querySelector(".nf-panel.active .nf-status");
    if(!el) el = root.querySelector(".nf-status");
    if(!el) return;
    el.textContent = text;
    el.className = `nf-status ${type}`;
  }
}
