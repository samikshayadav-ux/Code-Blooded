import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0f172a",
        panel: "#111827",
        line: "#253044"
      },
      boxShadow: {
        glow: "0 0 40px rgba(45, 212, 191, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
