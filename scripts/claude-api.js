// claude-api.js – Claude API calls (supports Anthropic direct + OpenRouter)

import { getSetting } from "./settings.js";

// Detect provider from key format
function getProviderConfig(apiKey) {
  if (!apiKey) throw new Error("No API key configured. Please add it in the Settings tab.");
  
  if (apiKey.startsWith("sk-or-")) {
    // OpenRouter
    return {
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: "anthropic/claude-sonnet-4-5",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/MrsPein/jens-easy-npc",
        "X-Title": "Jen's easy NPC"
      },
      format: "openai"
    };
  } else {
    // Anthropic direct
    return {
      url: "https://api.anthropic.com/v1/messages",
      model: "claude-sonnet-4-20250514",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      format: "anthropic"
    };
  }
}

async function callClaude(systemPrompt, userContent, maxTokens = 2000) {
  const apiKey = getSetting("anthropicKey");
  const config = getProviderConfig(apiKey);

  let body;
  if (config.format === "openai") {
    body = JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    });
  } else {
    body = JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }]
    });
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: config.headers,
    body
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message ?? err?.message ?? response.statusText;
    throw new Error(`Claude API error ${response.status}: ${msg}`);
  }

  const data = await response.json();

  // Extract text from either format
  if (config.format === "openai") {
    return data.choices?.[0]?.message?.content ?? "";
  } else {
    return data.content?.[0]?.text ?? "";
  }
}

// ── Race Card Extraction ────────────────────────────────────────────────────

const RACE_EXTRACTION_SYSTEM = `You are a D&D 5e race/species data extractor.
Given text about a playable race, extract ALL available data and return a JSON object.

IMPORTANT:
- Return ONLY valid JSON, no markdown fences, no preamble
- Mark any field you had to infer with a sibling field: "fieldName_aiGenerated": true
- Translate everything to English

JSON structure:
{
  "name": "string",
  "source": "string",
  "description": "string",
  "appearance": {
    "description": "string",
    "inspiration": "string",
    "skinColors": ["array"],
    "eyeColors": ["array"],
    "hairOrFeathers": "string",
    "heightRange": "string",
    "weightRange": "string",
    "distinctiveFeatures": ["array"]
  },
  "traits": {
    "creatureType": "string",
    "size": "string",
    "speed": { "walk": 30, "swim": 0, "fly": 0 },
    "abilityScoreIncreases": "string",
    "typicalAbilityScores": ["array"],
    "age": { "adulthood": 0, "lifespan": 0, "description": "string" },
    "alignment": "string",
    "languages": ["array"],
    "darkvision": 0,
    "resistances": [],
    "racialFeatures": [
      { "name": "string", "description": "string", "mechanics": "string" }
    ]
  },
  "subtypes": [{ "name": "string", "description": "string", "additionalFeatures": [] }],
  "culture": {
    "homeland": "string",
    "patronDeity": "string",
    "values": ["array"],
    "habits": ["array"],
    "likes": ["array"],
    "dislikes": ["array"]
  },
  "names": {
    "naming_conventions": "string",
    "examples": ["array"],
    "familyNames": []
  },
  "npcHints": {
    "personalityTraits": ["array"],
    "occupations": ["array"],
    "portraitPromptBase": "string"
  }
}`;

export async function extractRaceFromText(text) {
  const raw = await callClaude(RACE_EXTRACTION_SYSTEM, `Extract race data from this content:\n\n${text}`, 3000);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch(e) {
    throw new Error(`Could not parse Claude response as JSON: ${raw.substring(0, 200)}`);
  }
}

export async function extractRaceFromImageBase64(base64Data, mimeType) {
  const apiKey = getSetting("anthropicKey");
  const config = getProviderConfig(apiKey);

  let body, url, headers;

  if (config.format === "openai") {
    // OpenRouter supports vision via OpenAI format
    url = config.url;
    headers = config.headers;
    body = JSON.stringify({
      model: config.model,
      max_tokens: 3000,
      messages: [
        { role: "system", content: RACE_EXTRACTION_SYSTEM },
        { role: "user", content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
          { type: "text", text: "Extract all race/species information from this image. Return as JSON." }
        ]}
      ]
    });
  } else {
    url = config.url;
    headers = config.headers;
    body = JSON.stringify({
      model: config.model,
      max_tokens: 3000,
      system: RACE_EXTRACTION_SYSTEM,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mimeType, data: base64Data } },
        { type: "text", text: "Extract all race/species information from this image. Return as JSON." }
      ]}]
    });
  }

  const response = await fetch(url, { method: "POST", headers, body });
  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  const text = config.format === "openai"
    ? data.choices?.[0]?.message?.content ?? ""
    : data.content?.[0]?.text ?? "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── NPC Generation ──────────────────────────────────────────────────────────

export async function generateNPC(params) {
  const { race, raceClass, occupation, background, gender, age, wealth, specialWish, availableItems } = params;

  const systemPrompt = `You are a D&D 5e NPC generator. Generate a complete NPC as JSON.
Return ONLY valid JSON, no markdown fences.

JSON structure:
{
  "name": "string",
  "race": "string",
  "class": "string or null",
  "occupation": "string",
  "background": "string",
  "gender": "string",
  "age": "string",
  "alignment": "string",
  "personality": ["2-3 traits"],
  "ideal": "string",
  "bond": "string",
  "flaw": "string",
  "appearance": {
    "height": "string", "build": "string", "skinColor": "string",
    "eyeColor": "string", "hairOrFeatures": "string",
    "clothing": "string", "distinguishingFeatures": "string"
  },
  "stats": {
    "CR": 0, "HP": 0, "AC": 0,
    "STR": 10, "DEX": 10, "CON": 10, "INT": 10, "WIS": 10, "CHA": 10,
    "speed": "30 ft.", "skills": [], "languages": [], "senses": "string"
  },
  "equipment": ["list of items"],
  "spells": [],
  "backstory": "2-3 sentences",
  "portraitPrompt": "detailed image generation prompt"
}`;

  const raceDesc = race
    ? `Race: ${race.name}. ${race.appearance?.description ?? ""}. Colors: ${(race.appearance?.skinColors ?? []).join(", ")}. Features: ${(race.appearance?.distinctiveFeatures ?? []).join(", ")}.`
    : "Race: Human (generic)";

  const itemList = availableItems?.length
    ? `\nAvailable Foundry items (use exact names): ${availableItems.slice(0, 60).join(", ")}`
    : "";

  const prompt = `Generate an NPC:
${raceDesc}
Class: ${raceClass ?? "none (civilian)"}
Occupation: ${occupation ?? "random"}
Background: ${background ?? "random"}
Gender: ${gender ?? "random"}
Age: ${age ?? "normal"} (young=teens-20s, normal=30s-50s, old=60s+)
Wealth: ${wealth ?? "normal"} (arm=poor, bescheiden=modest, normal=average, wohlhabend=wealthy, aristokratisch=noble)
${specialWish ? `Special visual: ${specialWish}` : ""}
${itemList}

Make the portraitPrompt very detailed and specific - include exact appearance, clothing matching wealth, age, art style: fantasy portrait painterly detailed.`;

  const raw = await callClaude(systemPrompt, prompt, 2000);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch(e) {
    throw new Error(`Could not parse NPC data: ${raw.substring(0, 200)}`);
  }
}

export function buildPortraitPrompt(npcData, raceCard) {
  let prompt = npcData.portraitPrompt ?? "";
  if (raceCard?.npcHints?.portraitPromptBase) {
    prompt = `${raceCard.npcHints.portraitPromptBase}, ${prompt}`;
  }
  prompt += ", fantasy portrait, highly detailed, professional illustration, painterly";
  return prompt;
}
