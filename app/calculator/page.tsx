"use client";

import { useMemo, useState } from "react";
import {
  LISTENING_TABLE,
  READING_ACADEMIC_TABLE,
  READING_GENERAL_TABLE,
  listeningBand,
  overallBand,
  rawNeededForBand,
  readingBand,
  roundToNearestHalf,
  type BandRow,
} from "@/lib/bands";

const BAND_OPTIONS = Array.from({ length: 19 }, (_, i) => (i * 0.5).toFixed(1));
const TARGET_BANDS = ["9.0", "8.5", "8.0", "7.5", "7.0", "6.5", "6.0", "5.5", "5.0", "4.5", "4.0"];

function clampRaw(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(40, Math.round(value)));
}

function TableCard({ title, note, rows }: { title: string; note: string; rows: BandRow[] }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="pb-2 font-medium">Correct answers (out of 40)</th>
            <th className="pb-2 text-right font-medium">Band</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.band}
              className="border-b border-slate-100 last:border-0 dark:border-slate-800"
            >
              <td className="py-1.5 text-slate-700 dark:text-slate-300">
                {row.min === row.max ? row.min : `${row.min}–${row.max}`}
              </td>
              <td className="py-1.5 text-right font-semibold text-slate-900 dark:text-white">
                {row.band.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export default function CalculatorPage() {
  const [listeningRaw, setListeningRaw] = useState(30);
  const [readingRaw, setReadingRaw] = useState(30);
  const [track, setTrack] = useState<"academic" | "general">("academic");
  const [writingBand, setWritingBand] = useState("6.5");
  const [speakingBand, setSpeakingBand] = useState("6.5");
  const [targetBand, setTargetBand] = useState("7.0");

  const result = useMemo(() => {
    const l = listeningBand(listeningRaw);
    const r = readingBand(readingRaw, track);
    const w = Number(writingBand);
    const s = Number(speakingBand);
    const average = (l + r + w + s) / 4;
    const overall = overallBand(l, r, w, s);
    return { l, r, w, s, average, overall };
  }, [listeningRaw, readingRaw, track, writingBand, speakingBand]);

  const needed = useMemo(() => {
    const band = Number(targetBand);
    return {
      listening: rawNeededForBand(LISTENING_TABLE, band),
      academic: rawNeededForBand(READING_ACADEMIC_TABLE, band),
      general: rawNeededForBand(READING_GENERAL_TABLE, band),
    };
  }, [targetBand]);

  const frac = result.average - Math.floor(result.average);
  const near = (x: number) => Math.abs(frac - x) < 0.001;
  const roundingNote =
    near(0) || near(0.5)
      ? `The average is ${Number(result.average.toFixed(3))}, which is already a whole or half band.`
      : near(0.25)
        ? `The average ends in .25, so it rounds up to the next half band.`
        : near(0.75)
          ? `The average ends in .75, so it rounds up to the next whole band.`
          : near(0.125)
            ? `The average ends in .125, so it rounds down to the nearest half band.`
            : near(0.375)
              ? `The average ends in .375, so it rounds up to the nearest half band.`
              : near(0.625)
                ? `The average ends in .625, so it rounds down to the nearest half band.`
                : `The average ends in .875, so it rounds up to the next whole band.`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">IELTS Score Calculator</h1>
      <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
        Turn your practice marks into band scores the way IELTS does it. Listening
        and Reading are counted out of 40 and converted with the official tables.
        Writing and Speaking are marked by an examiner, so you enter the band
        yourself. Your overall band is the average of the four, rounded to the
        nearest half band.
      </p>

      {/* Calculator */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your marks</h2>
          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor="listening-raw" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Listening — correct answers out of 40
              </label>
              <input
                id="listening-raw"
                type="number"
                min={0}
                max={40}
                value={listeningRaw}
                onChange={(e) => setListeningRaw(clampRaw(Number(e.target.value)))}
                className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              <input
                type="range"
                min={0}
                max={40}
                value={listeningRaw}
                onChange={(e) => setListeningRaw(Number(e.target.value))}
                className="mt-2 w-full"
                aria-label="Listening correct answers"
              />
            </div>
            <div>
              <label htmlFor="reading-raw" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Reading — correct answers out of 40
              </label>
              <input
                id="reading-raw"
                type="number"
                min={0}
                max={40}
                value={readingRaw}
                onChange={(e) => setReadingRaw(clampRaw(Number(e.target.value)))}
                className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              <input
                type="range"
                min={0}
                max={40}
                value={readingRaw}
                onChange={(e) => setReadingRaw(Number(e.target.value))}
                className="mt-2 w-full"
                aria-label="Reading correct answers"
              />
              <div className="mt-3 flex gap-2" role="group" aria-label="Reading test type">
                {(["academic", "general"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrack(t)}
                    aria-pressed={track === t}
                    className={`rounded-md px-4 py-2 text-sm font-semibold ${
                      track === t
                        ? "bg-brand-600 text-white"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {t === "academic" ? "Academic" : "General Training"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="writing-band" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Writing band
                </label>
                <select
                  id="writing-band"
                  value={writingBand}
                  onChange={(e) => setWritingBand(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {BAND_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      Band {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="speaking-band" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Speaking band
                </label>
                <select
                  id="speaking-band"
                  value={speakingBand}
                  onChange={(e) => setSpeakingBand(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {BAND_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      Band {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-brand-600/40 bg-brand-50 p-6 dark:border-brand-400/40 dark:bg-brand-950/40">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your result</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
              <dt className="text-slate-600 dark:text-slate-300">Listening — {listeningRaw} / 40 correct</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">Band {result.l.toFixed(1)}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
              <dt className="text-slate-600 dark:text-slate-300">
                Reading ({track === "academic" ? "Academic" : "General Training"}) — {readingRaw} / 40 correct
              </dt>
              <dd className="font-semibold text-slate-900 dark:text-white">Band {result.r.toFixed(1)}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
              <dt className="text-slate-600 dark:text-slate-300">Writing</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">Band {result.w.toFixed(1)}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
              <dt className="text-slate-600 dark:text-slate-300">Speaking</dt>
              <dd className="font-semibold text-slate-900 dark:text-white">Band {result.s.toFixed(1)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Average: ({result.l.toFixed(1)} + {result.r.toFixed(1)} + {result.w.toFixed(1)} +{" "}
            {result.s.toFixed(1)}) ÷ 4 = {Number(result.average.toFixed(3))}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{roundingNote}</p>
          <p className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">
            Overall Band {result.overall.toFixed(1)}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            This is an estimate from your practice marks. In the real test the
            exact raw-score boundaries can move by a mark between test versions,
            and Writing and Speaking are marked by a human examiner — so treat
            this as a guide, not a prediction.
          </p>
        </article>
      </section>

      {/* What do I need? */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">What do I need for my target band?</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Pick a target band to see how many correct answers it takes in
          Listening and Reading. Writing and Speaking have no raw score — an
          examiner gives the band — so they are not listed here.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Target band">
          {TARGET_BANDS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setTargetBand(b)}
              aria-pressed={targetBand === b}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                targetBand === b
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">Listening (both tests)</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {needed.listening === null ? "—" : `${needed.listening} / 40 correct`}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">Reading — Academic</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {needed.academic === null ? "—" : `${needed.academic} / 40 correct`}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">Reading — General Training</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {needed.general === null ? "—" : `${needed.general} / 40 correct`}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          These are the lowest marks in each published table for Band {targetBand}.
          General Training Reading needs more correct answers for the same band
          because its texts are shorter and less complex.
        </p>
      </section>

      {/* How each module is scored */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">How your score is calculated</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white">Listening — 40 questions, 30 minutes + 10 to transfer answers</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              One mark per correct answer, no negative marking — a wrong answer
              costs the same as a blank one. Your total out of 40 is converted
              to a band with the table below. The same table is used for
              Academic and General Training.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white">Reading — 40 questions, 60 minutes</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              One mark per correct answer, no negative marking. Academic and
              General Training use different tables: General Training needs
              more correct answers for the same band. For example, 30 correct
              is Band 7.0 in Academic Reading but only Band 6.0 in General
              Training.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white">Writing — 2 tasks, 60 minutes</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              A certificated examiner marks each task against four criteria —
              Task Achievement (Task 1) or Task Response (Task 2), Coherence
              and Cohesion, Lexical Resource, and Grammatical Range and
              Accuracy — each worth 25%. Task 2 counts double: your Writing
              band is (Task 1 + 2 × Task 2) ÷ 3, rounded to the nearest half
              band. Task 1 needs at least 150 words, Task 2 at least 250.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white">Speaking — 3 parts, 11–14 minutes</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              A certificated examiner marks four criteria — Fluency and
              Coherence, Lexical Resource, Grammatical Range and Accuracy, and
              Pronunciation — each worth 25%. Your Speaking band is the average
              of the four, rounded to the nearest half band.
            </p>
          </article>
        </div>
        <article className="mt-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-white">Overall band — the average, rounded the official way</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Your overall band is the average of your four module bands, rounded
            to the nearest half band. An average ending in .25 rounds up to the
            next half band, and one ending in .75 rounds up to the next whole
            band. Worked examples from the British Council: Listening 6.5,
            Reading 6.5, Writing 5.0, Speaking 7.0 averages 6.25 → overall 6.5;
            Listening 4.0, Reading 3.5, Writing 4.0, Speaking 4.0 averages 3.875
            → overall 4.0; Listening 6.5, Reading 6.0, Writing 6.0, Speaking
            6.0 averages 6.125 → overall 6.0.
          </p>
        </article>
      </section>

      {/* Conversion tables */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Raw-score to band tables</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          These are the published average tables. IELTS adjusts the exact
          boundaries slightly between test versions to keep every version
          equally difficult, so a practice band is accurate to about half a
          band. IELTS publishes no conversion below Band 4.0.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <TableCard
            title="Listening"
            note="Same table for Academic and General Training."
            rows={LISTENING_TABLE}
          />
          <TableCard
            title="Reading — Academic"
            note="Three passages, 40 questions."
            rows={READING_ACADEMIC_TABLE}
          />
          <TableCard
            title="Reading — General Training"
            note="Shorter, everyday texts — so more correct answers are needed."
            rows={READING_GENERAL_TABLE}
          />
        </div>
      </section>

      <p className="mt-10 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Sources: IDP IELTS, “IELTS band scores — How they are calculated”
        (ielts.idp.com/nepal/results/scores); British Council, “How is IELTS
        assessed?” (takeielts.britishcouncil.org/results/how-is-ielts-assessed);
        IELTS, “Test format” (ielts.org/about-the-test/test-format). All
        checked 27 November 2026. This calculator is an independent practice
        tool and is not affiliated with the British Council, IDP or Cambridge.
      </p>
    </div>
  );
}
