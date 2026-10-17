"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

export default function ThemeToggle() {
  const { language } = useI18n();
  const [dark, setDark] = useState(false);
  const label = language === "en" ? "Toggle theme" : language === "zh" ? "切换主题" : "تبديل المظهر";

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = saved === "dark" || (saved !== "light" && prefersDark);
    setDark(next);
    applyTheme(next);
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={dark}
      onClick={() => {
        const next = !dark;
        setDark(next);
        applyTheme(next);
        window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      }}
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-800 transition hover:border-primary hover:text-primary dark:border-gray-800 dark:text-gray-100"
    >
      {dark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}
