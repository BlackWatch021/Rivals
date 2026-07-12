// One-time build script: pre-generates text + audio for the preset rivalries so
// they cost ZERO live API tokens at runtime (served as static files in /public).
//
//   node scripts/build-presets.mjs
//
// Re-run only if you change the presets or the default tone. Each run spends
// ElevenLabs characters (≈ the sum of the "spoken" lengths), so run sparingly.

import fs from "node:fs";
import path from "node:path";

// --- load .env.local -------------------------------------------------------
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const EL_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const VOICE = process.env.ELEVENLABS_VOICE_ID || "onwK4e9ZLuTAKqWW03F9";
if (!GEMINI_KEY || !EL_KEY) {
  console.error("Missing GEMINI_API_KEY or ELEVENLABS_API_KEY in .env.local");
  process.exit(1);
}

// Default tone must mirror lib/tones.ts "hype".
const TONE_ID = "hype";
const TONE_DIRECTION =
  "an electric, over-the-top stadium hype commentator — theatrical, loud, dramatic, building to a mic-drop.";

const PRESETS = [
  { a: "Barça", b: "Real Madrid", slug: "barca-real-madrid" },
  { a: "iOS", b: "Android", slug: "ios-android" },
  { a: "Cats", b: "Dogs", slug: "cats-dogs" },
  { a: "Messi", b: "Ronaldo", slug: "messi-ronaldo" },
  { a: "Coffee", b: "Tea", slug: "coffee-tea" },
  { a: "Marvel", b: "DC", slug: "marvel-dc" },
];

const norm = (s) => s.toLowerCase().trim();
const keyOf = (a, b, tone) => `${norm(a)}|${norm(b)}|${tone}`;

async function generate(a, b) {
  const prompt = `You are RIVAL, narrating the rivalry "${a}" vs "${b}".

Adopt this voice/tone: ${TONE_DIRECTION}

Trash-talk AND hype BOTH sides with wit and heat. Keep it fun and theatrical, never hateful, never using slurs or targeting real people's protected traits. Then call a bold winner and make a punchy prediction.

Produce TWO versions of the take:
- "monologue": the full written version, 90-140 words, punchy sentences, ending on a mic-drop line. This is shown on screen.
- "spoken": a SHORT spoken version of the same take, 45-70 words MAX, distilled to the hottest, most quotable lines. It will be read aloud by a text-to-speech voice, so it must sound great spoken and stay tight.

Rules:
- Reference BOTH "${a}" and "${b}" specifically.
- "winner" must be exactly one of the two names, spelled as given.
- "prediction" is one bold, quotable sentence.
- "passion" is an integer 0-100 rating how heated this rivalry is.

Return ONLY JSON matching this shape (no markdown, no backticks):
{"monologue": string, "spoken": string, "prediction": string, "winner": string, "passion": number}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 2048,
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
  const spoken = String(obj.spoken ?? "").trim() || String(obj.monologue ?? "");
  let winner = String(obj.winner ?? "").trim();
  if (winner !== a && winner !== b) winner = a;
  let passion = Number(obj.passion);
  if (!Number.isFinite(passion)) passion = 90;
  return {
    monologue: String(obj.monologue ?? "").trim(),
    spoken,
    prediction: String(obj.prediction ?? "").trim(),
    winner,
    passion: Math.max(0, Math.min(100, Math.round(passion))),
  };
}

async function voice(text) {
  const script = text;
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": EL_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
          style: 0.6,
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "presets");
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = {};
  let totalChars = 0;

  for (const p of PRESETS) {
    process.stdout.write(`• ${p.a} vs ${p.b} … `);
    let payload;
    for (let attempt = 1; ; attempt++) {
      try {
        payload = await generate(p.a, p.b);
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
        process.stdout.write(`retry(${attempt}) `);
      }
    }
    // The spoken line is what the client would send to TTS: match it here.
    const spokenScript = `${payload.spoken} And the winner? ${payload.winner}. ${payload.prediction}`;
    const mp3 = await voice(spokenScript);
    fs.writeFileSync(path.join(outDir, `${p.slug}.mp3`), mp3);
    totalChars += spokenScript.length;

    const entry = {
      ...payload,
      slug: p.slug,
      audio: `/presets/${p.slug}.mp3`,
      a: p.a,
      b: p.b,
      tone: TONE_ID,
    };
    manifest[keyOf(p.a, p.b, TONE_ID)] = entry;
    console.log(`ok (${mp3.length} bytes, ${spokenScript.length} chars)`);
  }

  fs.writeFileSync(
    path.join(outDir, "index.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(
    `\nDone. ${PRESETS.length} presets. ~${totalChars} ElevenLabs chars spent.`
  );
}

main().catch((e) => {
  console.error("build-presets failed:", e.message);
  process.exit(1);
});
