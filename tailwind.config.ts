import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        slate: {
          950: "#0b1020"
        },
        lime: {
          500: "#b6f14e"
        },
        sand: {
          100: "#f6f3ea"
        }
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.15)",
        lift: "0 12px 40px rgba(15, 23, 42, 0.25)"
      },
      backgroundImage: {
        "grain": "radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.05) 1px, transparent 0)",
        "glow": "radial-gradient(circle at 20% 0%, rgba(182, 241, 78, 0.35), transparent 45%), radial-gradient(circle at 85% 10%, rgba(59, 130, 246, 0.2), transparent 40%)"
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out"
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
