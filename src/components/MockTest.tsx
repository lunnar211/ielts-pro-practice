"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import ListeningExam, { type ModuleResult } from "@/components/ListeningExam";
import ReadingExam from "@/components/ReadingExam";
import SpeakingExam from "@/components/SpeakingExam";
import WritingExam from "@/components/WritingExam";
import { overallBand } from "@/lib/bands";
import { MOCK_PREFIX } from "@/lib/attempts";
import type { IELTSTest } from "@/lib/types";

const STEPS = [
  { module: "listening", label: "Listening", time: "30 + 10 min" },
  { module: "reading", label: "Reading", time: "60 min" },
  { module: "writing", label: "Writing", time: "60 min" },
  { module: "speaking", label: "Speaking", time: "11–14 min" },
] as const;

type ModuleKey = "listening" | "reading" | "writing" | "speaking";

export default function MockTest({ test }: { test: IELTSTest }) {
  const [step, setStep] = useState(0);
  const [bands, setBands] = useState<Partial<Record<ModuleKey, number>>>({});
  const [finished, setFinished] = useState(false);
  const bandsRef = useRef<Partial<Record<ModuleKey, number>>>({});

  const handleComplete = useCallback(
    (result: ModuleResult) => {
      const next = { ...bandsRef.current, [result.module]: result.band };
      bandsRef.current = next;
      setBands(next);
      if (
        next.listening !== undefined &&
        next.reading !== undefined &&
        next.writing !== undefined &&
        next.speaking !== undefined
      ) {
        const overall = overallBand(
          next.listening,
          next.reading,
          next.writing,
          next.speaking
        );
        try {
          window.localStorage.setItem(
            `${MOCK_PREFIX}${test.id}`,
            JSON.stringify({
              testId: test.id,
              module: "mock",
              band: overall,
              bands: next,
              savedAt: new Date().toISOString(),
            })
          );
        } catch {
          // The per-module attempts are already saved; the mock summary is a bonus.
        }
        setFinished(true);
        return;
      }
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    },
    [test.id]
  );

  if (finished && bands.listening !== undefined && bands.reading !== undefined && bands.writing !== undefined && bands.speaking !== undefined) {
    const overall = overallBand(bands.listening, bands.reading, bands.writing, bands.speaking);
    const rows: { label: string; band: number }[] = [
      { label: "Listening", band: bands.listening },
      { label: "Reading", band: bands.reading },
      { label: "Writing", band: bands.writing },
      { label: "Speaking", band: bands.speaking },
    ];
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Mock test complete — {test.title}
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {test.track === "academic" ? "Academic" : "General Training"} · all four modules
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Overall band</p>
          <p className="mt-1 font-mono text-5xl font-bold">{overall.toFixed(1)}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Mean of the four module bands, rounded to the nearest half band.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">{row.label}</p>
              <p className="mt-1 font-mono text-2xl font-bold">{row.band.toFixed(1)}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          AI estimate for practice only, not an official IELTS result. Writing
          and Speaking bands are AI estimates; Listening and Reading are marked
          against the answer key.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            View my dashboard
          </Link>
          <Link
            href="/practice/mock"
            className="rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Take another mock test
          </Link>
        </div>
      </div>
    );
  }

  const current = STEPS[step];
  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 pt-8">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Full mock test — {test.title} · about 2h 45m in total, no pausing
        </p>
        <ol className="mt-3 flex flex-wrap gap-2" aria-label="Mock test progress">
          {STEPS.map((item, index) => {
            const done = bands[item.module] !== undefined;
            const active = index === step;
            return (
              <li
                key={item.module}
                className={`flex-1 min-w-28 rounded-md border px-3 py-2 text-sm ${
                  active
                    ? "border-brand-600 bg-brand-50 font-semibold text-brand-700 dark:border-brand-400 dark:bg-brand-950 dark:text-brand-300"
                    : done
                      ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
                      : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                }`}
                aria-current={active ? "step" : undefined}
              >
                Step {index + 1} of {STEPS.length} — {item.label}
                <span className="block text-xs font-normal">
                  {item.time}
                  {done ? ` · Band ${bands[item.module]?.toFixed(1)}` : ""}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Each module submits straight into the next one. Your per-module
          results are saved as usual — review them on your dashboard after the
          mock.
        </p>
      </div>

      {current.module === "listening" && (
        <ListeningExam test={test} onComplete={handleComplete} />
      )}
      {current.module === "reading" && (
        <ReadingExam test={test} onComplete={handleComplete} />
      )}
      {current.module === "writing" && (
        <WritingExam test={test} onComplete={handleComplete} />
      )}
      {current.module === "speaking" && (
        <SpeakingExam test={test} onComplete={handleComplete} />
      )}
    </div>
  );
}
