import { NextRequest, NextResponse } from "next/server";
import { getTone } from "@/lib/tones";
import { generateRivalry } from "@/lib/gemini";

// Route handler runs on the server — GEMINI_API_KEY never reaches the browser.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerateBody = {
  a?: string;
  b?: string;
  tone?: string;
};

function clampName(v: unknown): string {
  return String(v ?? "").trim().slice(0, 60);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const a = clampName(body.a);
  const b = clampName(body.b);
  if (!a || !b) {
    return NextResponse.json(
      { error: "Provide two rivals (a and b)." },
      { status: 400 }
    );
  }
  const tone = getTone(body.tone);

  const result = await generateRivalry({
    a,
    b,
    toneDirection: tone.direction,
    apiKey,
  });
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error, status: result.status, code: result.code },
      { status: result.httpStatus }
    );
  }
  return NextResponse.json(result);
}
