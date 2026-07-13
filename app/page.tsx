"use client";

import { useEffect, useRef, useState } from "react";
import { TONES, DEFAULT_TONE, type ToneId } from "@/lib/tones";

type RivalResult = {
  monologue: string;
  spoken: string;
  prediction: string;
  winner: string;
  passion: number;
  powersA: string[];
  weaknessesA: string[];
  powersB: string[];
  weaknessesB: string[];
};

type PresetEntry = RivalResult & { audio: string; a: string; b: string };

const PRESETS: [string, string][] = [
  ["Barça", "Real Madrid"],
  ["iOS", "Android"],
  ["Cats", "Dogs"],
  ["Messi", "Ronaldo"],
  ["Coffee", "Tea"],
  ["Marvel", "DC"],
];

const norm = (s: string) => s.toLowerCase().trim();
const keyOf = (a: string, b: string, tone: string) =>
  `${norm(a)}|${norm(b)}|${tone}`;

export default function Home() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [tone, setTone] = useState<ToneId>(DEFAULT_TONE);
  const [result, setResult] = useState<RivalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cachedAudio, setCachedAudio] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [modal, setModal] = useState<null | "voice" | "gemini">(null);
  // The two names that produced the current result (so cards stay correct
  // even if the inputs are edited afterward).
  const [names, setNames] = useState<{ a: string; b: string }>({ a: "", b: "" });

  const manifestRef = useRef<Record<string, PresetEntry>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track the last object URL so we can revoke it (static preset URLs are not revoked).
  const objectUrlRef = useRef<string | null>(null);

  // Load the pre-built preset manifest once (served statically, no API cost).
  useEffect(() => {
    fetch("/presets/index.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((m) => (manifestRef.current = m || {}))
      .catch(() => (manifestRef.current = {}));
  }, []);

  function resetAudio() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setAudioUrl(null);
  }

  async function ignite() {
    const nameA = a.trim();
    const nameB = b.trim();
    if (!nameA || !nameB) {
      setError("Name both rivals to ignite the clash.");
      return;
    }
    setError(null);
    setResult(null);
    resetAudio();
    setCachedAudio(null);
    setFromCache(false);
    setNames({ a: nameA, b: nameB });

    // Pre-built preset? Serve the cached text + audio instantly, zero API cost.
    const hit = manifestRef.current[keyOf(nameA, nameB, tone)];
    if (hit) {
      setResult(hit);
      setCachedAudio(hit.audio);
      setFromCache(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a: nameA, b: nameB, tone }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data?.code === "quota_exhausted") {
          setModal("gemini");
          return;
        }
        throw new Error(data?.error || "Generation failed.");
      }
      setResult(data as RivalResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function playUrl(url: string) {
    setAudioUrl(url);
    requestAnimationFrame(() => {
      audioRef.current?.load();
      audioRef.current?.play().catch(() => {});
    });
  }

  async function speak() {
    if (!result) return;

    // Preset audio is pre-generated — just play it (free, instant).
    if (cachedAudio) {
      playUrl(cachedAudio);
      return;
    }

    setError(null);
    setVoiceLoading(true);
    try {
      const script = `${result.spoken} And the winner? ${result.winner}. ${result.prediction}`;
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429 && data?.code === "quota_exhausted") {
          setModal("voice");
          return;
        }
        throw new Error(data?.error || "Voice generation failed.");
      }
      const blob = await res.blob();
      resetAudio();
      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;
      playUrl(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice failed.");
    } finally {
      setVoiceLoading(false);
    }
  }

  function usePreset([pa, pb]: [string, string]) {
    setA(pa);
    setB(pb);
    setError(null);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-5 py-10 sm:py-16">
      <header className="text-center">
        <h1 className="text-fire animate-shimmer text-6xl font-black tracking-tighter sm:text-8xl">
          RIVAL
        </h1>
        <p className="mt-3 text-sm font-medium uppercase tracking-[0.3em] text-orange-300/70">
          Settle the rivalry
        </p>
      </header>

      {/* Input cards */}
      <section className="mt-10 grid w-full grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <RivalInput
          label="Challenger"
          placeholder="e.g. Barça"
          value={a}
          onChange={setA}
          accent="from-orange-500/20 to-red-500/10 border-orange-500/40"
        />
        <div className="flex items-center justify-center">
          <span className="select-none text-2xl font-black text-zinc-500">
            VS
          </span>
        </div>
        <RivalInput
          label="Contender"
          placeholder="e.g. Real Madrid"
          value={b}
          onChange={setB}
          accent="from-rose-500/20 to-pink-500/10 border-rose-500/40"
        />
      </section>

      {/* Presets */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.join("-")}
            onClick={() => usePreset(p)}
            className="rounded-full border border-zinc-700/70 bg-zinc-800/40 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-orange-400/60 hover:text-orange-200"
          >
            {p[0]} vs {p[1]}
          </button>
        ))}
      </div>

      {/* Tone selector */}
      <div className="mt-6 w-full">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Pick a tone
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {TONES.map((t) => {
            const active = t.id === tone;
            return (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "border-orange-400 bg-orange-500/20 text-orange-100 shadow-[0_0_20px_-6px_rgba(255,95,31,0.8)]"
                    : "border-zinc-700/70 bg-zinc-800/30 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}
              >
                <span className="mr-1">{t.emoji}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ignite */}
      <button
        onClick={ignite}
        disabled={loading}
        className="mt-8 w-full max-w-xs rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 px-8 py-4 text-lg font-black uppercase tracking-widest text-white shadow-[0_10px_40px_-10px_rgba(255,45,85,0.7)] transition enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:opacity-70"
      >
        {loading ? "Igniting…" : "🔥 Ignite"}
      </button>

      {loading && <IgnitionLoader />}

      {error && !loading && (
        <p className="mt-4 text-sm font-medium text-rose-400">{error}</p>
      )}

      {/* Result */}
      {result && (
        <section className="mt-10 w-full animate-slide-up rounded-3xl border border-orange-500/20 bg-zinc-900/60 p-6 backdrop-blur sm:p-8">
          <PassionMeter value={result.passion} />

          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-zinc-100">
            {result.monologue}
          </p>

          {(result.powersA.length > 0 || result.powersB.length > 0) && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ScoutCard
                name={names.a}
                accent="border-orange-500/40"
                powers={result.powersA}
                weaknesses={result.weaknessesA}
              />
              <ScoutCard
                name={names.b}
                accent="border-rose-500/40"
                powers={result.powersB}
                weaknesses={result.weaknessesB}
              />
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-700/60 bg-zinc-800/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-300/70">
                Winner
              </p>
              <p className="mt-1 text-2xl font-black text-fire">
                {result.winner}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-700/60 bg-zinc-800/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-300/70">
                Bold prediction
              </p>
              <p className="mt-1 text-base font-medium italic text-zinc-200">
                “{result.prediction}”
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={speak}
              disabled={voiceLoading}
              className="flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/10 px-6 py-3 text-sm font-bold uppercase tracking-widest text-orange-200 transition enabled:hover:bg-orange-500/20 disabled:opacity-60"
            >
              {voiceLoading ? "Summoning voice…" : "▶ Hear the commentary"}
            </button>
            {fromCache && (
              <span className="text-xs font-medium text-emerald-400/80">
                ⚡ Instant preset · free replay
              </span>
            )}
            {audioUrl && (
              <audio
                ref={audioRef}
                controls
                src={audioUrl}
                className="w-full max-w-md"
              />
            )}
          </div>
        </section>
      )}

      <footer className="mt-auto pt-14 text-center text-xs text-zinc-600">
        Powered by <span className="text-zinc-400">Google Gemini</span> +{" "}
        <span className="text-zinc-400">ElevenLabs</span>. Built for the DEV
        Weekend Challenge.
      </footer>

      {modal && <Modal variant={modal} onClose={() => setModal(null)} />}
    </main>
  );
}

function IgnitionLoader() {
  return (
    <div className="mt-6 flex w-full max-w-sm animate-slide-up flex-col items-center gap-3">
      <div className="flex items-end gap-1.5 text-3xl">
        <span className="animate-flicker [animation-delay:-0.3s]">🔥</span>
        <span className="animate-flicker [animation-delay:-0.15s]">🔥</span>
        <span className="animate-flicker">🔥</span>
      </div>
      <p className="animate-pulse text-xs font-bold uppercase tracking-[0.35em] text-orange-300">
        Igniting the rivalry…
      </p>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="animate-loadbar absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-rose-500" />
      </div>
    </div>
  );
}

function RivalInput({
  label,
  placeholder,
  value,
  onChange,
  accent,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <label
      className={`block rounded-2xl border bg-gradient-to-br ${accent} p-4 transition focus-within:ring-2 focus-within:ring-orange-400/50`}
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={60}
        className="mt-1 w-full bg-transparent text-xl font-bold text-white placeholder:text-zinc-500 focus:outline-none"
      />
    </label>
  );
}

function ScoutCard({
  name,
  accent,
  powers,
  weaknesses,
}: {
  name: string;
  accent: string;
  powers: string[];
  weaknesses: string[];
}) {
  return (
    <div className={`rounded-2xl border ${accent} bg-zinc-800/40 p-4`}>
      <p className="truncate text-lg font-black text-fire">{name}</p>
      {powers.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400/80">
            💪 Powers
          </p>
          <ul className="mt-1 space-y-1">
            {powers.map((p, i) => (
              <li key={i} className="text-sm text-zinc-200">
                <span className="text-emerald-400">▸</span> {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {weaknesses.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-rose-400/80">
            ⚠️ Weaknesses
          </p>
          <ul className="mt-1 space-y-1">
            {weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-zinc-200">
                <span className="text-rose-400">▸</span> {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PassionMeter({ value }: { value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-orange-300/70">
        <span>Passion meter</span>
        <span className="text-fire">{value}/100</span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full animate-pulse-fire rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Modal({
  variant,
  onClose,
}: {
  variant: "voice" | "gemini";
  onClose: () => void;
}) {
  const content =
    variant === "voice"
      ? {
          emoji: "🪫",
          title: "The commentator lost his voice!",
          body: (
            <>
              So sorry — kindly ask the creator to <em>graduate</em> from
              ElevenLabs&rsquo; free tier to a paid one. 🙏💸
            </>
          ),
          tag: "Voice tokens exhausted",
          cta: "Fine, I’ll just read it",
        }
      : {
          emoji: "🧠",
          title: "RIVAL’s writer needs a breather!",
          body: (
            <>
              The rivalry-writer (Google Gemini) hit its free{" "}
              <em>daily</em> limit. Nudge the creator to upgrade — or try a
              preset, which needs no live AI. 🙏💸
            </>
          ),
          tag: "Gemini daily quota exhausted",
          cta: "Try a preset instead",
        };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-slide-up w-full max-w-md rounded-3xl border border-orange-500/30 bg-zinc-900 p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl">{content.emoji}</div>
        <h2 className="mt-4 text-2xl font-black text-fire">{content.title}</h2>
        <p className="mt-3 text-base font-medium leading-relaxed text-zinc-200">
          {content.body}
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-rose-400/80">
          {content.tag}
        </p>
        <button
          onClick={onClose}
          className="mt-6 rounded-full bg-gradient-to-r from-orange-500 to-rose-600 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-white transition hover:scale-[1.03]"
        >
          {content.cta}
        </button>
      </div>
    </div>
  );
}
