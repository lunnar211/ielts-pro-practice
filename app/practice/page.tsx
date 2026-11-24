import Link from "next/link";

const MODULES = [
  {
    href: "/practice/listening",
    name: "Listening",
    time: "30 + 10 min",
    description:
      "4 sections, 40 questions. Each recording plays once, then 10 minutes to transfer your answers — just like the real test.",
  },
  {
    href: "/practice/reading",
    name: "Reading",
    time: "60 min",
    description:
      "3 passages, 40 questions. Highlight the text, take notes, and get instant marking with evidence for every answer.",
  },
  {
    href: "/practice/writing",
    name: "Writing",
    time: "60 min",
    description:
      "Task 1 (20 min) + Task 2 essay (40 min). AI marking with per-criterion bands, corrections and a model answer. Handwriting upload included.",
  },
  {
    href: "/practice/speaking",
    name: "Speaking",
    time: "11–14 min",
    description:
      "Parts 1, 2 and 3 with a cue card and 1-minute preparation. Record or upload your answers and get an AI report with fluency stats.",
  },
];

export default function PracticePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Practice</h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        Practise one module at a time, or sit the full mock test. Every test
        uses one of the two free sample tests — Sample Test 1 (Academic) and
        Sample Test 2 (General Training).
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {MODULES.map((module) => (
          <article
            key={module.href}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {module.name}
              </h2>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {module.time}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {module.description}
            </p>
            <Link
              href={module.href}
              className="mt-4 inline-block w-fit rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Practise {module.name}
            </Link>
          </article>
        ))}
      </div>

      <article className="mt-6 rounded-lg border border-brand-600/40 bg-brand-50 p-6 dark:border-brand-400/40 dark:bg-brand-950/40">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Full Mock Test
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          All four modules back to back in real test order — Listening, then
          Reading, then Writing, then Speaking — with one combined overall
          band at the end. Set aside about 2 hours 45 minutes and treat it
          like the real exam: no pausing, no replaying the audio.
        </p>
        <Link
          href="/practice/mock"
          className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Take a full mock test
        </Link>
      </article>

      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        Your attempts are saved to your account when you are signed in, or on
        this device when you are not. See your progress on the{" "}
        <Link
          href="/dashboard"
          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          dashboard
        </Link>
        .
      </p>
    </div>
  );
}
