import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Header from "@/components/Header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IELTS Pro Practice — Free IELTS mock tests & AI marking",
  description:
    "Practice Listening, Reading, Writing and Speaking with full IELTS mock tests, instant band scores and AI feedback. Free tier, no card required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Header />
          <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            {children}
          </main>
          <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            IELTS Pro Practice — free IELTS preparation. Not affiliated with the
            British Council, IDP or Cambridge.
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
