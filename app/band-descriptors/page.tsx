import {
  BAND_SCALE,
  SAMPLE_ESSAY,
  SPEAKING_CRITERIA,
  WRITING_TASK1_CRITERIA,
  WRITING_TASK2_CRITERIA,
  type CriterionGuide,
} from "@/lib/descriptors";

function CriterionSection({ criterion }: { criterion: CriterionGuide }) {
  return (
    <article className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{criterion.name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {criterion.whatItMeans}
      </p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="w-20 pb-2 font-medium">Band</th>
            <th className="pb-2 font-medium">What it looks like</th>
          </tr>
        </thead>
        <tbody>
          {criterion.levels.map((level) => (
            <tr
              key={level.band}
              className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800"
            >
              <td className="py-2 pr-3 font-semibold text-slate-900 dark:text-white">
                {level.band}.0
              </td>
              <td className="py-2 text-slate-700 dark:text-slate-300">{level.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export default function BandDescriptorsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Band Descriptors — how examiners mark you
      </h1>
      <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
        Listening and Reading are counted: 40 questions, one mark each. Writing
        and Speaking are marked by a certificated examiner against four
        criteria each. This page explains those criteria in plain words, so you
        know exactly what each band means — and what to fix to reach the next
        one. The summaries are written by this site from the official public
        band descriptors published by IELTS.
      </p>

      {/* The 9-band scale */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">The 9-band scale</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Every IELTS result is reported on this scale, in whole and half
          bands. Your overall band is the average of your four module bands.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-4 py-2 font-medium">Band</th>
                <th className="px-4 py-2 font-medium">Level</th>
                <th className="px-4 py-2 font-medium">What it means</th>
              </tr>
            </thead>
            <tbody>
              {BAND_SCALE.map((row) => (
                <tr
                  key={row.band}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-4 py-2 font-semibold text-slate-900 dark:text-white">{row.band}</td>
                  <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{row.label}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Writing Task 1 */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Writing Task 1 — Academic charts, maps and processes, or a General Training letter
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          At least 150 words, about 20 minutes. Each task is marked on its own
          and the task score is the average of its four criteria.
        </p>
        {WRITING_TASK1_CRITERIA.map((c) => (
          <CriterionSection key={c.name} criterion={c} />
        ))}
      </section>

      {/* Writing Task 2 */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Writing Task 2 — the essay</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          At least 250 words, about 40 minutes. Task 2 counts double in your
          Writing band: (Task 1 + 2 × Task 2) ÷ 3.
        </p>
        {WRITING_TASK2_CRITERIA.map((c) => (
          <CriterionSection key={c.name} criterion={c} />
        ))}
      </section>

      {/* Speaking */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Speaking — Parts 1, 2 and 3, 11–14 minutes
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          The examiner rates your average performance across the whole test.
          Each criterion is worth 25% and the Speaking band is their average.
        </p>
        {SPEAKING_CRITERIA.map((c) => (
          <CriterionSection key={c.name} criterion={c} />
        ))}
      </section>

      {/* Sample Band 7 essay */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          What a Band 7 essay looks like
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          The essay below is an original practice example written for this
          site — it is NOT an official IELTS answer. Read it, then read the
          examiner-style comments to see why it scores Band 7 and what would
          lift it to Band 8.
        </p>
        <article className="mt-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Task 2 question</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{SAMPLE_ESSAY.topic}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {SAMPLE_ESSAY.wordCount} words · minimum 250 · overall Band {SAMPLE_ESSAY.overallBand}.0
          </p>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {SAMPLE_ESSAY.paragraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </article>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {SAMPLE_ESSAY.comments.map((c) => (
            <article
              key={c.name}
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">{c.name}</h3>
                <span className="shrink-0 rounded-full bg-brand-600/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                  Band {c.band}.0
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{c.comment}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How bands are worked out */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">How the bands are worked out</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <li>
            <strong className="text-slate-900 dark:text-white">Writing:</strong> each task is
            marked on its four criteria and the task band is their average.
            Task 2 counts double: (Task 1 + 2 × Task 2) ÷ 3, rounded to the
            nearest half band.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">Speaking:</strong> the four
            criteria are averaged into one band, rounded to the nearest half
            band.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">Overall:</strong> the average
            of the four module bands, rounded to the nearest half band. An
            average ending in .25 rounds up to the next half band; one ending
            in .75 rounds up to the next whole band.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">Hard rules:</strong> an answer
            of 20 words or fewer scores Band 1 on every criterion. Words copied
            from the question do not count as your own vocabulary. Under-length
            answers (below 150 words in Task 1, below 250 in Task 2) lose marks
            on Task Achievement / Task Response.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">Honest note:</strong> only a
            certificated IELTS examiner can give a real band. The AI marking
            on this site follows the same criteria to give you the closest
            practice estimate it can — treat it as a guide for what to improve,
            not as your test-day result.
          </li>
        </ul>
      </section>

      <p className="mt-10 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Sources: IDP IELTS, “IELTS band scores — How they are calculated”
        (ielts.idp.com/nepal/results/scores); British Council, “How is IELTS
        assessed?” (takeielts.britishcouncil.org/results/how-is-ielts-assessed);
        IELTS, “Test format” (ielts.org/about-the-test/test-format). All
        checked 27 November 2026. This guide is an independent practice aid and
        is not affiliated with the British Council, IDP or Cambridge.
      </p>
    </div>
  );
}
