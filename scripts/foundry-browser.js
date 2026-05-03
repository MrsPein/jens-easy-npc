// foundry-browser.js – Scans Foundry folders/compendiums for existing content

export async function getItemsOfType(type) {
  const results = [];
  for (const item of game.items) {
    if (matchesType(item, type)) results.push(formatItem(item, "World"));
  }
  for (const pack of game.packs) {
    if (!["Item","RollTable","JournalEntry"].includes(pack.metadata.type)) continue;
    try {
      const index = await pack.getIndex();
      for (const entry of index) {
        results.push({ id: `${pack.collection}.${entry._id}`, name: entry.name, type, source: pack.metadata.label, packId: pack.collection, entryId: entry._id, isCompendium: true });
      }
    } catch(e) {}
  }
  return results;
}

function matchesType(item, type) {
  const typeMap = { "background":["background"],"class":["class"],"subclass":["subclass"],"feat":["feat"],"spell":["spell"],"weapon":["weapon"],"equipment":["equipment","armor"],"consumable":["consumable"],"loot":["loot"],"tool":["tool"] };
  return (typeMap[type] ?? [type]).includes(item.type);
}

function formatItem(item, source) {
  return { id: item.id, name: item.name, type: item.type, source, img: item.img, isWorld: true, data: item.toObject() };
}

export async function searchFoundryContent(query, types=[], limit=30) {
  const q = query.toLowerCase().trim();
  if (q.length < 1) return [];
  const results = [];
  for (const item of game.items) {
    if (types.length && !types.includes(item.type)) continue;
    if (item.name.toLowerCase().includes(q)) { results.push(formatItem(item, "World")); if (results.length >= limit) return results; }
  }
  for (const pack of game.packs) {
    if (!["Item","RollTable","JournalEntry"].includes(pack.metadata.type)) continue;
    try {
      const index = await pack.getIndex();
      for (const entry of index) {
        if (entry.name.toLowerCase().includes(q)) {
          results.push({ id: `${pack.collection}.${entry._id}`, name: entry.name, source: pack.metadata.label, packId: pack.collection, entryId: entry._id, isCompendium: true });
          if (results.length >= limit) return results;
        }
      }
    } catch(e) {}
  }
  return results;
}

export async function getBackgrounds(query="") {
  if (query.length >= 1) return searchFoundryContent(query, ["background"], 40);
  return getItemsOfType("background");
}

export async function getCompendiumItem(packId, entryId) {
  const pack = game.packs.get(packId);
  if (!pack) return null;
  return pack.getDocument(entryId);
}
