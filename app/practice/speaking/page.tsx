import Link from "next/link";
import { listTests } from "@/lib/seed";

export default function SpeakingPracticePage() {
  const tests = listTests();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-2xl font-bold">Speaking practice</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Full Speaking tests, 11–14 minutes: Part 1 interview, Part 2 long
        turn with a cue card, and Part 3 discussion. Record your answers with
        your microphone (or upload an audio file), get a transcript, and
        receive an AI examiner report with a band for each criterion.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {tests.map((test) => (
          <article
            key={test.id}
            className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              {test.track === "academic" ? "Academic" : "General Training"}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{test.title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Part 2 topic: {test.speaking.part2.topic}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              3 parts · 11–14 minutes · AI marking
            </p>
            <Link
              href={`/practice/speaking/${test.id}`}
              className="mt-5 inline-block rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Start test
            </Link>
          </article>
        ))}
      </div>

      <Link
        href="/practice"
        className="mt-8 inline-block text-sm font-medium text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-brand-400"
      >
        ← Back to practice
      </Link>
    </div>
  );
}
