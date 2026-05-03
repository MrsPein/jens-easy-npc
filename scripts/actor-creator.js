// actor-creator.js – Creates a Foundry dnd5e Actor from generated NPC data

export async function createNPCActor(npcData, portraitPath) {
  const actorData = buildActorData(npcData, portraitPath);
  const actor = await Actor.create(actorData);
  if (npcData.equipment?.length) await addItemsToActor(actor, npcData.equipment);
  actor.sheet.render(true);
  ui.notifications.info(`NPC Forge: "${npcData.name}" created!`);
  return actor;
}

function buildActorData(npc, portraitPath) {
  const img = portraitPath ?? "icons/svg/mystery-man.svg";
  return {
    name: npc.name ?? "Unknown NPC", type: "npc", img,
    "token.img": img, "token.name": npc.name, "token.vision": true, "token.actorLink": false,
    system: {
      details: {
        biography: { value: buildBiography(npc) },
        race: npc.race ?? "", background: npc.background ?? "",
        alignment: npc.alignment ?? "true neutral", cr: npc.stats?.CR ?? 0,
        type: { value: "humanoid", subtype: npc.race ?? "" }
      },
      attributes: {
        hp: { value: npc.stats?.HP ?? 10, max: npc.stats?.HP ?? 10 },
        ac: { flat: npc.stats?.AC ?? 10 },
        movement: { walk: parseSpeed(npc.stats?.speed), swim: npc.stats?.swimSpeed ?? 0, fly: npc.stats?.flySpeed ?? 0 }
      },
      abilities: {
        str: { value: npc.stats?.STR ?? 10 }, dex: { value: npc.stats?.DEX ?? 10 },
        con: { value: npc.stats?.CON ?? 10 }, int: { value: npc.stats?.INT ?? 10 },
        wis: { value: npc.stats?.WIS ?? 10 }, cha: { value: npc.stats?.CHA ?? 10 }
      },
      traits: { languages: { value: parseLanguages(npc.stats?.languages ?? []) } }
    },
    flags: { "npc-forge": { generated: true, raceData: npc.race, timestamp: Date.now() } }
  };
}

function buildBiography(npc) {
  const lines = [];
  if (npc.backstory) lines.push(`<p><strong>Backstory:</strong> ${npc.backstory}</p>`);
  if (npc.occupation) lines.push(`<p><strong>Occupation:</strong> ${npc.occupation}</p>`);
  if (npc.appearance) {
    const a = npc.appearance;
    lines.push(`<p><strong>Appearance:</strong> ${a.height ?? ""}, ${a.build ?? ""}, ${a.skinColor ?? ""} skin, ${a.eyeColor ?? ""} eyes. ${a.distinguishingFeatures ?? ""}</p>`);
    if (a.clothing) lines.push(`<p><strong>Clothing:</strong> ${a.clothing}</p>`);
  }
  if (npc.personality?.length) lines.push(`<p><strong>Personality:</strong> ${npc.personality.join(". ")}</p>`);
  if (npc.ideal) lines.push(`<p><strong>Ideal:</strong> ${npc.ideal}</p>`);
  if (npc.bond) lines.push(`<p><strong>Bond:</strong> ${npc.bond}</p>`);
  if (npc.flaw) lines.push(`<p><strong>Flaw:</strong> ${npc.flaw}</p>`);
  return lines.join("\n");
}

async function addItemsToActor(actor, equipmentNames) {
  const itemsToAdd = [];
  for (const name of equipmentNames) {
    const worldItem = game.items.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (worldItem) { itemsToAdd.push(worldItem.toObject()); continue; }
    for (const pack of game.packs) {
      if (pack.metadata.type !== "Item") continue;
      try {
        const index = await pack.getIndex();
        const entry = index.find(e => e.name.toLowerCase() === name.toLowerCase());
        if (entry) { const doc = await pack.getDocument(entry._id); if (doc) { itemsToAdd.push(doc.toObject()); break; } }
      } catch(e) {}
    }
  }
  if (itemsToAdd.length > 0) await actor.createEmbeddedDocuments("Item", itemsToAdd);
}

function parseSpeed(s) { const m = String(s||"").match(/\d+/); return m ? parseInt(m[0]) : 30; }
function parseLanguages(languages) {
  const map = { "common":"common","elvish":"elvish","dwarvish":"dwarvish","draconic":"draconic","infernal":"infernal","celestial":"celestial","abyssal":"abyssal","sylvan":"sylvan","undercommon":"undercommon","aquan":"aquan","auran":"auran","ignan":"ignan","terran":"terran" };
  return languages.map(l => map[l.toLowerCase()] ?? l.toLowerCase()).filter(Boolean);
}
