import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Zcash altını
        zec: {
          DEFAULT: "#F4B728",
          50: "#FFF8E6",
          100: "#FDEDC2",
          200: "#FADB85",
          300: "#F7C94F",
          400: "#F4B728",
          500: "#E0A112",
          600: "#C1860B",
          700: "#946509",
          800: "#6B490A",
          900: "#3D2A07",
        },
        app: v("bg-app"),
        card: v("bg-card"),
        elevated: v("bg-elevated"),
        input: v("bg-input"),
        line: v("line"),
        ink: v("ink"),
        muted: v("muted"),
        soft: v("soft"),
        tint: v("tint"),
        accent: v("accent"),
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "12px",
      },
      boxShadow: {
        // KnowNow'daki imza "3D" buton gölgesi, Zcash tonlarında
        press: "0 3px 0 0 #C8920F",
        pressInk: "0 3px 0 0 #000000",
        card: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.12)",
      },
      keyframes: {
        pop: { "0%": { transform: "scale(.9)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        rise: { "0%": { transform: "translateY(12px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: {
        pop: "pop .25s ease-out both",
        rise: "rise .35s ease-out both",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
