import Link from "next/link";
import {
  Headphones,
  BookOpen,
  PenLine,
  Mic,
  CheckCircle2,
  BarChart3,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const MODULES = [
  {
    icon: Headphones,
    title: "Listening",
    description:
      "Four sections, 40 questions, real exam timing. Audio, transcripts and instant band conversion.",
  },
  {
    icon: BookOpen,
    title: "Reading",
    description:
      "Academic and General Training passages with True / False / Not Given, matching and completion questions.",
  },
  {
    icon: PenLine,
    title: "Writing",
    description:
      "Task 1 charts, maps and letters plus Task 2 essays — marked by AI against the four official criteria.",
  },
  {
    icon: Mic,
    title: "Speaking",
    description:
      "Parts 1, 2 and 3 with a recorder, transcript and AI feedback on fluency, vocabulary and grammar.",
  },
];

const FEATURES = [
  {
    icon: CheckCircle2,
    title: "Instant band scores",
    description: "Listening and Reading convert to bands with the official tables.",
  },
  {
    icon: Sparkles,
    title: "AI marking",
    description: "Writing and Speaking marked with criterion scores and a model answer.",
  },
  {
    icon: BarChart3,
    title: "Progress dashboard",
    description: "Track every attempt, see your weakest module and watch your band climb.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Free IELTS practice — Academic &amp; General Training
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Practise like the real exam. Know your band before test day.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Full mock tests for all four modules, instant band scores, AI marking
          for Writing and Speaking, and a dashboard that shows exactly what to
          improve next.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            Take a free sample test <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/practice"
            className="rounded-md border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Browse all practice tests
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No card required. Your first full test is free.
        </p>
      </section>

      {/* Modules */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          All four modules, one place
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((mod) => (
            <article
              key={mod.title}
              className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <mod.icon className="h-8 w-8 text-brand-600" />
              <h3 className="mt-4 text-lg font-semibold">{mod.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {mod.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Why practise here?
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-950">
                <f.icon className="h-8 w-8 text-brand-600" />
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {f.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Sample test CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Try a sample test now</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
          Ten minutes, a taste of each module, and an estimated band — no
          account needed to start.
        </p>
        <Link
          href="/practice"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Start the sample test <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Understand your score */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          Understand your score
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600 dark:text-slate-300">
          Know how IELTS turns your answers into a band — and what each band
          means — before test day.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold">Score Calculator</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Turn your practice marks into bands with the official conversion
              tables, see what you need for your target band, and learn how
              the overall band is rounded.
            </p>
            <Link
              href="/calculator"
              className="mt-4 inline-flex items-center gap-2 font-semibold text-brand-600 hover:text-brand-700"
            >
              Open the calculator <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold">Band Descriptors Guide</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              The four marking criteria for Writing and Speaking, explained in
              plain words for Bands 5 to 9 — plus a Band 7 sample essay with
              examiner-style comments.
            </p>
            <Link
              href="/band-descriptors"
              className="mt-4 inline-flex items-center gap-2 font-semibold text-brand-600 hover:text-brand-700"
            >
              Read the guide <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </div>
      </section>

      {/* Free practice CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-2xl bg-brand-600 px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to reach your target band?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Everything here is free — practise all four modules, get instant
            band scores and AI marking on every Writing and Speaking task. No
            account needed.
          </p>
          <Link
            href="/practice"
            className="mt-6 inline-block rounded-md bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50"
          >
            Start practising free
          </Link>
        </div>
      </section>
    </div>
  );
}
