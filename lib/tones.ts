// Shared tone definitions used by both the UI and the generate API.
export type ToneId =
  | "hype"
  | "savage"
  | "sarcastic"
  | "professional"
  | "wholesome";

export const DEFAULT_TONE: ToneId = "hype";

export type Tone = {
  id: ToneId;
  label: string;
  emoji: string;
  /** Injected into the Gemini prompt to steer the voice of the monologue. */
  direction: string;
};

export const TONES: Tone[] = [
  {
    id: "hype",
    label: "Hype",
    emoji: "🔥",
    direction:
      "an electric, over-the-top stadium hype commentator — theatrical, loud, dramatic, building to a mic-drop.",
  },
  {
    id: "savage",
    label: "Savage",
    emoji: "😈",
    direction:
      "a merciless roast master — brutal, cocky, razor-sharp burns on both sides (playful, never hateful or bigoted).",
  },
  {
    id: "sarcastic",
    label: "Sarcastic",
    emoji: "🙄",
    direction:
      "a dry, deadpan, eye-rolling wit — heavy sarcasm and mock-seriousness, secretly loving the drama.",
  },
  {
    id: "professional",
    label: "Professional",
    emoji: "🎩",
    direction:
      "a poised, authoritative analyst — measured, insightful, broadcast-quality, with restrained flair.",
  },
  {
    id: "wholesome",
    label: "Wholesome",
    emoji: "🤝",
    direction:
      "a warm, good-natured host — celebrates both sides with heart and humor, friendly rivalry, feel-good energy.",
  },
];

export function getTone(id: string | undefined | null): Tone {
  return TONES.find((t) => t.id === id) ?? TONES[0];
}
