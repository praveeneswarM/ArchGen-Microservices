import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080b11",
        card: "rgba(15, 22, 36, 0.7)",
        border: "rgba(255, 255, 255, 0.08)",
        primary: {
          DEFAULT: "#4f46e5", // Indigo
          hover: "#4338ca",
          glow: "rgba(79, 70, 229, 0.4)",
        },
        secondary: {
          DEFAULT: "#06b6d4", // Cyan
          glow: "rgba(6, 182, 212, 0.4)",
        },
        accent: {
          purple: "#8b5cf6",
          emerald: "#10b981",
          rose: "#f43f5e",
          amber: "#f59e0b",
        }
      },
      backgroundImage: {
        "cyber-grid": "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
        "glow-gradient": "radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.15) 0%, transparent 80%)",
      },
      backgroundSize: {
        "cyber-grid-size": "30px 30px",
      },
      boxShadow: {
        "neon-blue": "0 0 15px rgba(6, 182, 212, 0.25)",
        "neon-purple": "0 0 15px rgba(139, 92, 246, 0.25)",
        "neon-indigo": "0 0 15px rgba(79, 70, 229, 0.25)",
        "glass-inset": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "border-glow": "borderGlow 3s ease infinite alternate",
        "text-glow": "textGlow 2s ease infinite alternate",
      },
      keyframes: {
        borderGlow: {
          "0%": { borderColor: "rgba(79, 70, 229, 0.2)" },
          "100%": { borderColor: "rgba(6, 182, 212, 0.6)" },
        },
        textGlow: {
          "0%": { textShadow: "0 0 10px rgba(6, 182, 212, 0.2)" },
          "100%": { textShadow: "0 0 20px rgba(6, 182, 212, 0.6)" },
        }
      }
    },
  },
  plugins: [],
};

export default config;
