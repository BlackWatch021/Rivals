# 🔥 RIVAL — Settle the rivalry

A passion-fueled **rivalry hype generator**. Enter two rivals — football teams,
`iOS vs Android`, `cats vs dogs`, anything you feel strongly about — hit **IGNITE**,
and RIVAL spits out fiery, witty trash-talk plus a bold prediction, then _speaks_
it back to you in dramatic commentator-style audio.

Built for the [DEV Weekend Challenge: Passion Edition](https://dev.to/devteam/join-our-dev-weekend-challenge-passion-edition-1000-in-prizes-across-five-winners-submissions-10j5?).

## How it works

- **Google Gemini** writes the passionate rivalry monologue, picks a winner, and
  rates the "passion" of the matchup — prompt-tuned for wit and heat.
- **ElevenLabs** turns that text into expressive spoken-word audio, played right
  on the page.

Both API keys stay **server-side**. The browser only ever talks to this app's own
route handlers (`/api/generate`, `/api/voice`), which call the vendors with the
secret keys. Nothing sensitive is exposed in the client bundle.

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS
- Two server Route Handlers (`app/api/generate`, `app/api/voice`)
- Deployed on Vercel

## Run locally

```bash
npm install
cp .env.local.example .env.local   # then fill in your keys
npm run dev                        # http://localhost:3000
```

### Environment variables

| Variable              | Required | Notes                                                   |
| --------------------- | -------- | ------------------------------------------------------- |
| `GEMINI_API_KEY`      | ✅       | [Google AI Studio](https://aistudio.google.com/apikey)  |
| `GEMINI_MODEL`        | —        | Defaults to `gemini-flash-latest`                       |
| `ELEVENLABS_API_KEY`  | ✅       | [ElevenLabs](https://elevenlabs.io) → Profile → API key |
| `ELEVENLABS_VOICE_ID` | —        | Defaults to `onwK4e9ZLuTAKqWW03F9` ("Daniel")           |

> Keys are **never** prefixed `NEXT_PUBLIC_` and `.env.local` is git-ignored.
