// Backfill powers/weaknesses onto the existing preset manifest WITHOUT
// touching the audio (Gemini-only — costs zero ElevenLabs characters).
//
//   node scripts/augment-presets.mjs

import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
if (!GEMINI_KEY) {
  console.error("Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const toBullets = (v) =>
  Array.isArray(v)
    ? v.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, 3)
    : [];

async function scout(a, b) {
  const prompt = `Scout the rivalry "${a}" vs "${b}" like a coach.
Give 3 punchy strengths and 3 punchy weaknesses for EACH side.
Each entry is a SHORT phrase (2-5 words), witty but fair. Never hateful, no slurs.

Return ONLY JSON (no markdown, no backticks):
{"powersA": string[], "weaknessesA": string[], "powersB": string[], "weaknessesB": string[]}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let text = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  if (!text.startsWith("{")) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) text = m[0];
  }
  const obj = JSON.parse(text);
  return {
    powersA: toBullets(obj.powersA),
    weaknessesA: toBullets(obj.weaknessesA),
    powersB: toBullets(obj.powersB),
    weaknessesB: toBullets(obj.weaknessesB),
  };
}

async function main() {
  const file = path.join(process.cwd(), "public", "presets", "index.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const key of Object.keys(manifest)) {
    const e = manifest[key];
    process.stdout.write(`• ${e.a} vs ${e.b} … `);
    let fields;
    for (let attempt = 1; ; attempt++) {
      try {
        fields = await scout(e.a, e.b);
        break;
      } catch (err) {
        if (attempt >= 3) throw err;
        process.stdout.write(`retry(${attempt}) `);
      }
    }
    Object.assign(e, fields);
    console.log(
      `ok (A:${fields.powersA.length}/${fields.weaknessesA.length}, B:${fields.powersB.length}/${fields.weaknessesB.length})`
    );
  }

  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
  console.log("\nManifest updated. Audio untouched. 0 ElevenLabs chars spent.");
}

main().catch((e) => {
  console.error("augment-presets failed:", e.message);
  process.exit(1);
});
