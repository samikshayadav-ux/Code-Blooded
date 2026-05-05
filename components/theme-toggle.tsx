"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("dlrs-theme") as Theme | null;
    const initialTheme = savedTheme ?? "dark";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("light", initialTheme === "light");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("dlrs-theme", nextTheme);
    document.documentElement.classList.toggle("light", nextTheme === "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 text-sm font-semibold text-slate-100 transition duration-300 hover:bg-white/10"
      aria-label="Toggle light and dark theme"
    >
      <span className="relative flex h-6 w-11 items-center rounded-full bg-slate-950/60 p-1 ring-1 ring-white/10 transition">
        <span
          className={`flex size-4 items-center justify-center rounded-full bg-cyan-200 text-slate-950 transition-transform duration-300 ${
            theme === "light" ? "translate-x-5" : "translate-x-0"
          }`}
        >
          {theme === "light" ? <Sun size={12} aria-hidden /> : <Moon size={12} aria-hidden />}
        </span>
      </span>
      <span className="hidden sm:inline">{theme === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}
