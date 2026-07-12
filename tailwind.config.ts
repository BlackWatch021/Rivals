import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-fire": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.03)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        loadbar: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(240%)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "50%": { opacity: "0.6", transform: "translateY(-3px) scale(1.15)" },
        },
      },
      animation: {
        "pulse-fire": "pulse-fire 2.4s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out both",
        shimmer: "shimmer 6s ease infinite",
        loadbar: "loadbar 1.1s ease-in-out infinite",
        flicker: "flicker 0.9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
