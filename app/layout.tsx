import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RIVAL — Settle the rivalry",
  description:
    "Enter two rivals. RIVAL writes fiery, witty trash-talk and a bold prediction, then speaks it back to you in dramatic commentator-style audio. Powered by Google Gemini + ElevenLabs.",
  openGraph: {
    title: "RIVAL — Settle the rivalry",
    description:
      "Passion-fueled rivalry hype generator. Gemini writes the smack-talk, ElevenLabs voices it.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-display text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
