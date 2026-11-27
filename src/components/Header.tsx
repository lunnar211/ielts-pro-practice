"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Type } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/practice", label: "Practice" },
  { href: "/calculator", label: "Calculator" },
  { href: "/band-descriptors", label: "Band Guide" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setLargeText(localStorage.getItem("ielts-large-text") === "1");
    } catch {
      // localStorage unavailable — large-text stays off.
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    try {
      localStorage.setItem("ielts-large-text", largeText ? "1" : "0");
    } catch {
      // localStorage unavailable — preference is session-only.
    }
  }, [largeText]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-slate-900 dark:text-white">
          IELTS <span className="text-brand-600">Pro Practice</span>
        </Link>
        <nav className="hidden items-center gap-6 sm:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLargeText((v) => !v)}
            aria-pressed={largeText}
            aria-label="Toggle large text"
            title="Large text (accessibility)"
            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Type className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle dark mode"
            title="Toggle dark / light mode"
            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <nav
        className="flex items-center gap-6 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:hidden dark:border-slate-800"
        aria-label="Main navigation (mobile)"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
