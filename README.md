<div align="center">

# 🔥 RIVAL

### Settle the rivalry.

Pick **any two rivals** — real or fictional, living or non-living, serious or completely ridiculous. RIVAL writes fiery trash-talk, scouts each side's **powers & weaknesses**, crowns a **winner**, and then **reads the whole thing out loud** like a dramatic sports commentator.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-000000?style=for-the-badge&logo=elevenlabs&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

**[🔴 Live Demo](https://rivals-tau.vercel.app/) · [📖 Read the story](https://dev.to/blackwatch021/rival-i-built-an-ai-that-settles-any-rivalry-out-loud-3hkc) · [🎬 Watch the demo](https://www.youtube.com/watch?v=zhl_VvIZPkk)**

<img src="public/images/herosection_with_complete_result.png" width="820" alt="RIVAL settling Barça vs Real Madrid — monologue, passion meter, and powers/weaknesses cards" />

</div>

---

## ✨ What it does

- 🥊 **Any matchup** — `Goku vs Naruto`, `iOS vs Android`, `Cats vs Dogs`, `Coffee vs Tea`… if you can name two things, you can pit them.
- ✍️ **Fiery AI monologue** that trash-talks _and_ hypes both sides.
- 💪 **Scouting cards** — Powers & Weaknesses for each contender.
- 🏆 **A winner + a bold prediction**, plus a **passion meter** for the beef.
- 🎙️ **Dramatic spoken commentary** — the verdict, read aloud.
- 🎭 **Five tones** — Hype, Savage, Sarcastic, Professional, Wholesome.
- ⚡ **Six instant presets** that play with zero API calls.

## 🖼️ Screenshots

<table>
  <tr>
    <td width="50%"><img src="public/images/herosection.png" alt="RIVAL setup: two rival inputs, presets, tone selector, and the IGNITE button" /></td>
    <td width="50%"><img src="public/images/scouting_cards_power_weakness.png" alt="Powers and Weaknesses scouting cards for Cats vs Dogs" /></td>
  </tr>
  <tr>
    <td align="center"><em>Two rivals, six presets, five tones, one big red button.</em></td>
    <td align="center"><em>Every side gets scouted — powers & weaknesses.</em></td>
  </tr>
  <tr>
    <td width="50%"><img src="public/images/audio_player.png" alt="Hear the commentary button with a 39-second audio player" /></td>
    <td width="50%"><img src="public/images/quotapopup.png" alt="Friendly popup shown when the free-tier quota runs out" /></td>
  </tr>
  <tr>
    <td align="center"><em>~40 seconds of dramatic, spoken-word commentary.</em></td>
    <td align="center"><em>Out of free-tier quota? Fail with a smile.</em></td>
  </tr>
</table>

## 🧠 How it works

Two server-side **Route Handlers** do all the sensitive work, so the API keys **never** touch the browser — the frontend only ever calls _this app's own_ endpoints:

| Endpoint | Powered by | Job |
| --- | --- | --- |
| `POST /api/generate` | **Google Gemini** | Writes the monologue, the short spoken version, powers/weaknesses, winner, prediction & passion score — as structured JSON, steered by the chosen tone. |
| `POST /api/voice` | **ElevenLabs** | Turns the short spoken version into expressive commentator audio (MP3). |

## 🛠️ Tech

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- Server Route Handlers in `app/api/generate` and `app/api/voice`
- Shared logic in `lib/` (`gemini.ts`, `tones.ts`)
- Deployed on **Vercel**

## 🧩 A few fun engineering bits

- **The "thinking model" trap.** Gemini kept returning truncated JSON — the reasoning tokens were eating the whole budget. Setting `thinkingConfig: { thinkingBudget: 0 }` and giving it room fixed it instantly.
- **Two versions of every take.** Gemini returns a full on-screen monologue _and_ a tight ~40-second spoken version. Only the short one is voiced — roughly **4× cheaper** on ElevenLabs characters (~2,000 → ~340 per go).
- **Zero-cost presets.** The six preset matchups are pre-generated (text _and_ audio) into static files under `public/presets/`, served from a manifest with **no live API calls** — instant, free, and infinitely replayable.
- **Free-tier voice.** Library voices (e.g. "Rachel") return `402` on the free tier; the default is a premade broadcaster voice ("Daniel") that works — and suits a commentator anyway.
- **Failing with a smile.** When a quota runs out, the app shows a friendly popup and nudges you toward a preset instead of throwing a raw error.

## 🚀 Run locally

```bash
npm install
cp .env.local.example .env.local   # then fill in your keys
npm run dev                        # http://localhost:3000
```

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | — | Defaults to `gemini-flash-latest` |
| `ELEVENLABS_API_KEY` | ✅ | [ElevenLabs](https://elevenlabs.io) → Profile → API key |
| `ELEVENLABS_VOICE_ID` | — | Defaults to `onwK4e9ZLuTAKqWW03F9` ("Daniel") |

> Keys are **never** prefixed `NEXT_PUBLIC_`, and `.env.local` is git-ignored — nothing sensitive reaches the client bundle.

### Rebuilding the presets (optional)

```bash
node scripts/build-presets.mjs      # regenerates preset text + audio (spends API quota)
node scripts/augment-presets.mjs    # backfills powers/weaknesses (Gemini only)
```

## 🏆 Built for

The [**DEV Weekend Challenge: Passion Edition**](https://dev.to/challenges/weekend-2026-07-09) — targeting **Best Use of Google AI** (Gemini writes it) and **Best Use of ElevenLabs** (it voices it).

<div align="center">

**Now go settle something ridiculous.** 🦇🐱

</div>
