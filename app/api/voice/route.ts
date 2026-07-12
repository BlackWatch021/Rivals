import { NextRequest, NextResponse } from "next/server";

// Server-only: ELEVENLABS_API_KEY never reaches the browser.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Daniel — Steady Broadcaster": a premade voice usable on the ElevenLabs free
// tier. (Library voices like "Rachel" return HTTP 402 for free-tier API keys.)
const DEFAULT_VOICE = "onwK4e9ZLuTAKqWW03F9";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ELEVENLABS_API_KEY." },
      { status: 500 }
    );
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = String(body.text ?? "").trim().slice(0, 2500);
  if (!text) {
    return NextResponse.json({ error: "No text to voice." }, { status: 400 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  try {
    const elRes = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
          style: 0.6,
          use_speaker_boost: true,
        },
      }),
    });

    if (!elRes.ok) {
      const detail = await elRes.text();
      console.error("ElevenLabs error", elRes.status, detail);

      // Detect "out of monthly characters" so the client can show a friendly
      // popup instead of a generic error. ElevenLabs signals this as HTTP 401
      // with detail.status "quota_exceeded" (sometimes 429); we also keyword-
      // match the body to be resilient to shape changes.
      const lower = detail.toLowerCase();
      const exhausted =
        elRes.status === 429 ||
        lower.includes("quota_exceeded") ||
        lower.includes("quota exceeded") ||
        (lower.includes("quota") &&
          (lower.includes("exceed") || lower.includes("exhaust"))) ||
        lower.includes("credits") && lower.includes("run out");

      if (exhausted) {
        return NextResponse.json(
          { error: "Voice quota exhausted.", code: "quota_exhausted" },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "ElevenLabs request failed.", status: elRes.status },
        { status: 502 }
      );
    }

    const audio = await elRes.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("voice route error", err);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
