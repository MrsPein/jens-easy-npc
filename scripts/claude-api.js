// claude-api.js – All Claude API calls

import { getSetting } from "./settings.js";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const API_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(systemPrompt, userContent, maxTokens = 2000) {
  const apiKey = getSetting("anthropicKey");
  if (!apiKey) throw new Error("No Anthropic API key configured. Please add it in Module Settings.");

  const messages = [{ role: "user", content: userContent }];

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API error ${response.status}: ${err?.error?.message ?? response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ── Race Card Extraction ────────────────────────────────────────────────────

const RACE_EXTRACTION_SYSTEM = `You are a D&D 5e race/species data extractor.
Given text, image descriptions, or PDF content about a playable race, extract ALL available data and return a JSON object.

IMPORTANT:
- Return ONLY valid JSON, no markdown, no preamble
- Mark any field you had to infer or guess (not explicitly stated) with a sibling field: "fieldName_aiGenerated": true
- Translate everything to English
- Be thorough - extract every mechanical detail

JSON structure:
{
  "name": "string",
  "source": "string (book/setting name)",
  "description": "string (lore/flavor text)",
  "appearance": {
    "description": "string",
    "inspiration": "string (real animal/creature it resembles)",
    "skinColors": ["array of possible colors/textures"],
    "eyeColors": ["array"],
    "hairOrFeathers": "string description",
    "heightRange": "string e.g. 4-5 feet",
    "weightRange": "string",
    "distinctiveFeatures": ["array of notable physical traits"]
  },
  "traits": {
    "creatureType": "humanoid|fey|etc",
    "size": "Small|Medium|Large",
    "speed": { "walk": 30, "swim": 0, "fly": 0, "climb": 0 },
    "abilityScoreIncreases": "string description",
    "typicalAbilityScores": ["e.g. Charisma", "Dexterity"],
    "age": { "adulthood": 0, "lifespan": 0, "description": "string" },
    "alignment": "string",
    "languages": ["list of languages"],
    "darkvision": 0,
    "resistances": [],
    "immunities": [],
    "racialFeatures": [
      {
        "name": "string",
        "description": "string",
        "mechanics": "string (mechanical effect)",
        "aiGenerated": false
      }
    ]
  },
  "subtypes": [
    {
      "name": "string",
      "description": "string",
      "additionalFeatures": []
    }
  ],
  "culture": {
    "homeland": "string",
    "patronDeity": "string",
    "values": ["array"],
    "habits": ["typical behaviors/habits"],
    "likes": ["array"],
    "dislikes": ["array"],
    "socialStructure": "string"
  },
  "names": {
    "naming_conventions": "string",
    "examples": ["list of example names"],
    "familyNames": []
  },
  "npcHints": {
    "personalityTraits": ["common personality traits for NPCs"],
    "occupations": ["typical occupations"],
    "portraitPromptBase": "string (base prompt for image generation, describing the race visually)"
  }
}`;

export async function extractRaceFromText(text) {
  const raw = await callClaude(
    RACE_EXTRACTION_SYSTEM,
    `Extract race data from this content:\n\n${text}`,
    3000
  );
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

export async function extractRaceFromImageBase64(base64Data, mimeType, additionalText = "") {
  const apiKey = getSetting("anthropicKey");
  if (!apiKey) throw new Error("No Anthropic API key configured.");

  const content = [
    {
      type: "image",
      source: { type: "base64", media_type: mimeType, data: base64Data }
    },
    {
      type: "text",
      text: `Extract all race/species information from this image. ${additionalText}\n\nReturn as JSON per the schema.`
    }
  ];

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 3000,
      system: RACE_EXTRACTION_SYSTEM,
      messages: [{ role: "user", content }]
    })
  });

  if (!response.ok) throw new Error(`Claude API error ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.content[0].text.replace(/```json|```/g, "").trim());
}

// ── NPC Generation ──────────────────────────────────────────────────────────

export async function generateNPC(params) {
  const {
    race,        // race card object or null
    raceClass,   // class name string or null
    occupation,  // string or null
    background,  // background name string or null
    gender,      // string or null
    age,         // "young"|"normal"|"old"
    wealth,      // "arm"|"bescheiden"|"normal"|"wohlhabend"|"aristokratisch"
    specialWish, // optional freetext
    availableItems // array of item names from Foundry
  } = params;

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
  "age": "string (specific age number)",
  "alignment": "string",
  "personality": ["2-3 personality traits"],
  "ideal": "string",
  "bond": "string",
  "flaw": "string",
  "appearance": {
    "height": "string",
    "build": "string",
    "skinColor": "string (specific, from race palette)",
    "eyeColor": "string",
    "hairOrFeatures": "string",
    "clothing": "string (appropriate to wealth/occupation)",
    "distinguishingFeatures": "string"
  },
  "stats": {
    "CR": 0,
    "HP": 0,
    "AC": 0,
    "STR": 10, "DEX": 10, "CON": 10, "INT": 10, "WIS": 10, "CHA": 10,
    "speed": "30 ft.",
    "skills": ["list"],
    "languages": ["list"],
    "senses": "string"
  },
  "equipment": ["list of items appropriate to wealth/class/occupation"],
  "spells": [],
  "actions": [],
  "backstory": "2-3 sentences",
  "portraitPrompt": "string (detailed Imagen/DALL-E prompt for portrait)"
}`;

  const raceDesc = race
    ? `Race: ${race.name}. Appearance traits: ${race.appearance?.description ?? ""}. Typical colors: ${(race.appearance?.skinColors ?? []).join(", ")}. Features: ${(race.appearance?.distinctiveFeatures ?? []).join(", ")}.`
    : "Race: Human (generic)";

  const itemList = availableItems?.length
    ? `\n\nAvailable items in this Foundry world (use these names exactly when assigning equipment):\n${availableItems.slice(0, 80).join(", ")}`
    : "";

  const prompt = `Generate an NPC with these parameters:
${raceDesc}
Class: ${raceClass ?? "none (civilian NPC)"}
Occupation: ${occupation ?? "random appropriate"}
Background: ${background ?? "random"}
Gender: ${gender ?? "random"}
Age group: ${age ?? "normal"} (young=teens-20s, normal=30s-50s, old=60s+)
Wealth level: ${wealth ?? "normal"} (arm=poor/ragged, bescheiden=modest, normal=average, wohlhabend=wealthy, aristokratisch=noble/luxury)
${specialWish ? `Special visual request: ${specialWish}` : ""}
${itemList}

For the portraitPrompt field, write a detailed image generation prompt that includes:
- Exact physical appearance (from race traits + randomized specifics)
- Clothing matching wealth level and occupation  
- Age appearance
- Art style: fantasy portrait, painterly, detailed, studio lighting
${specialWish ? `- Include this special element: ${specialWish}` : ""}
- NOT generic - make it specific and vivid`;

  const raw = await callClaude(systemPrompt, prompt, 2000);
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// ── Image Prompt Builder ────────────────────────────────────────────────────

export function buildPortraitPrompt(npcData, raceCard) {
  // Use Claude-generated prompt as base, enhance with race card data
  let prompt = npcData.portraitPrompt ?? "";

  if (raceCard?.npcHints?.portraitPromptBase) {
    prompt = `${raceCard.npcHints.portraitPromptBase}, ${prompt}`;
  }

  // Add quality tags
  prompt += ", fantasy portrait, highly detailed, professional illustration, painterly style";

  return prompt;
}
