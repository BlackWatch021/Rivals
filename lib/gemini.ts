// Server-side Gemini generation. Imported by the /api/generate route.
// Keep this out of the route file itself — Next.js route modules may only
// export HTTP handlers and a few config keys.

export type RivalPayload = {
  monologue: string;
  spoken: string;
  prediction: string;
  winner: string;
  passion: number;
};

export type GenerateResult =
  | RivalPayload
  | { error: string; status?: number; httpStatus: number; code?: string };

export async function generateRivalry({
  a,
  b,
  toneDirection,
  apiKey,
}: {
  a: string;
  b: string;
  toneDirection: string;
  apiKey: string;
}): Promise<GenerateResult> {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are RIVAL, narrating the rivalry "${a}" vs "${b}".

Adopt this voice/tone: ${toneDirection}

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

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1.0,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      // gemini-flash-latest is a 2.5 "thinking" model; without this the
      // reasoning tokens eat the whole budget and the JSON gets truncated.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  // The model occasionally emits malformed JSON; a re-roll (temperature 1.0)
  // reliably fixes it, so retry a couple of times before giving up.
  for (let attempt = 1; attempt <= 3; attempt++) {
    let geminiRes: Response;
    try {
      geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });
    } catch (err) {
      console.error("generate fetch error", err);
      return { error: "Could not reach Gemini.", httpStatus: 502 };
    }

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      console.error("Gemini error", geminiRes.status, detail);
      // Free-tier daily/per-minute limits surface as 429 RESOURCE_EXHAUSTED.
      const lower = detail.toLowerCase();
      const exhausted =
        geminiRes.status === 429 ||
        lower.includes("resource_exhausted") ||
        lower.includes("quota");
      if (exhausted) {
        return {
          error: "Gemini quota exhausted.",
          code: "quota_exhausted",
          status: 429,
          httpStatus: 429,
        };
      }
      return {
        error: "Gemini request failed.",
        status: geminiRes.status,
        httpStatus: 502,
      };
    }

    const data = await geminiRes.json();
    const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = parsePayload(raw, a, b);
    if (parsed) return parsed;
    console.warn(`generate: parse failed (attempt ${attempt})`);
  }

  return { error: "Could not parse a rivalry from the model.", httpStatus: 502 };
}

function parsePayload(raw: string, a: string, b: string): RivalPayload | null {
  let text = raw.trim();
  // Strip accidental code fences just in case.
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  // Fall back to extracting the first {...} block.
  if (!text.startsWith("{")) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) text = match[0];
  }

  try {
    const obj = JSON.parse(text);
    const monologue = String(obj.monologue ?? "").trim();
    if (!monologue) return null;
    // Fall back to the monologue if the model omitted a spoken version.
    const spoken = String(obj.spoken ?? "").trim() || monologue;
    let winner = String(obj.winner ?? "").trim();
    if (winner !== a && winner !== b) winner = a;
    let passion = Number(obj.passion);
    if (!Number.isFinite(passion)) passion = 88;
    passion = Math.max(0, Math.min(100, Math.round(passion)));
    return {
      monologue,
      spoken,
      prediction: String(obj.prediction ?? "").trim(),
      winner,
      passion,
    };
  } catch {
    return null;
  }
}
