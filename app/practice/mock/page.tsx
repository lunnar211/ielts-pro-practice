import Link from "next/link";
import { listTests } from "@/lib/seed";

export default function MockPickerPage() {
  const tests = listTests();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Full Mock Test
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        All four modules back to back in real test order — Listening, Reading,
        Writing, Speaking — with one combined overall band at the end.
      </p>
      <p className="mt-2 max-w-2xl rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        The full mock takes about 2h 45m. Set aside uninterrupted time and
        treat it like the real exam: no pausing, no replaying the audio, and
        each module submits straight into the next one.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {tests.map((test) => (
          <article
            key={test.id}
            className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              {test.track === "academic" ? "Academic" : "General Training"}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
              {test.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Listening 30 + 10 min · Reading 60 min · Writing 60 min ·
              Speaking 11–14 min
            </p>
            <Link
              href={`/practice/mock/${test.id}`}
              className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Start full mock test
            </Link>
          </article>
        ))}
      </div>

      <Link
        href="/practice"
        className="mt-8 inline-block text-sm font-medium text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-brand-400"
      >
        ← Back to Practice
      </Link>
    </div>
  );
}
