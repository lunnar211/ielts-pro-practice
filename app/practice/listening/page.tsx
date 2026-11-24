import Link from "next/link";
import { listTests } from "@/lib/seed";

export default function ListeningPracticePage() {
  const tests = listTests();
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Listening practice
      </h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Each test has 4 sections and 40 questions: 30 minutes of listening
        plus 10 minutes to transfer your answers. Each recording plays once,
        just like the real test.
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
              40 questions · 30 min + 10 min transfer
            </p>
            <Link
              href={`/practice/listening/${test.id}`}
              className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Start Listening test
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
