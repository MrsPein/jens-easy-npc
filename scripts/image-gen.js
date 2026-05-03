// image-gen.js – Portrait generation via Imagen 3 or DALL-E 3
import { getSetting } from "./settings.js";

export async function generatePortrait(prompt) {
  const provider = getSetting("imageProvider");
  return provider === "dalle" ? generateWithDalle(prompt) : generateWithImagen(prompt);
}

async function generateWithImagen(prompt) {
  const apiKey = getSetting("imageApiKey");
  if (!apiKey) throw new Error("No Gemini API key configured.");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: "1:1", personGeneration: "allow_adult", safetyFilterLevel: "block_few" } })
  });
  if (!response.ok) throw new Error(`Imagen API error ${response.status}`);
  const data = await response.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("Imagen returned no image data.");
  return `data:image/png;base64,${b64}`;
}

async function generateWithDalle(prompt) {
  const apiKey = getSetting("imageApiKey");
  if (!apiKey) throw new Error("No OpenAI API key configured.");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "dall-e-3", prompt: prompt.slice(0,4000), n: 1, size: "1024x1024", quality: "standard", response_format: "b64_json" })
  });
  if (!response.ok) throw new Error(`DALL-E API error ${response.status}`);
  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("DALL-E returned no image data.");
  return `data:image/png;base64,${b64}`;
}

export async function savePortraitToFoundry(dataUrl, npcName) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const filename = `${npcName.toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${Date.now()}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  try { await FilePicker.createDirectory("data", "npc-forge"); } catch(e) {}
  const upload = await FilePicker.upload("data", "npc-forge", file, {});
  return upload.path;
}
