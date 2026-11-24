"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IELTSTest } from "@/lib/types";
import { writingOverallBand } from "@/lib/bands";
import type { WritingMarkingResult } from "@/lib/prompts";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const EXAM_SECONDS = 60 * 60;
const DISCLAIMER = "AI estimate for practice only, not an official IELTS result";

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

interface TaskResult extends WritingMarkingResult {
  disclaimer?: string;
  underLengthNote?: string | null;
}

function CriteriaTable({ result }: { result: TaskResult }) {
  return (
    <div className="mt-4 space-y-3">
      {result.criteria.map((criterion) => (
        <div
          key={criterion.name}
          className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="font-semibold">{criterion.name}</h4>
            <span className="font-mono text-xl font-bold">
              {criterion.band.toFixed(1)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {criterion.justification}
          </p>
        </div>
      ))}
    </div>
  );
}

function TaskReport({
  title,
  result,
}: {
  title: string;
  result: TaskResult;
}) {
  return (
    <section
      aria-label={`${title} report`}
      className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/50"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-lg">
          Band <span className="font-mono text-2xl font-bold">{result.overallBand.toFixed(1)}</span>
          <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
            {result.wordCount} words
            {result.underLength ? " · under length" : ""}
          </span>
        </p>
      </div>

      {result.underLength && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {result.underLengthNote ??
            `Under-length answer: ${result.wordCount} words, below the minimum. In the real test this lowers the Task Achievement / Task Response band.`}
        </p>
      )}

      {(result.offTopic || result.memorisedTemplate) && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {result.offTopic && (
            <p>
              <strong>Off-topic:</strong> {result.offTopicNote}
            </p>
          )}
          {result.memorisedTemplate && (
            <p className="mt-1">
              <strong>Memorised template detected:</strong>{" "}
              {result.memorisedTemplateNote}
            </p>
          )}
        </div>
      )}

      <CriteriaTable result={result} />

      {result.paragraphAnalysis.length > 0 && (
        <div className="mt-5">
          <h4 className="font-semibold">Paragraph structure</h4>
          <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {result.paragraphAnalysis.map((entry, index) => (
              <li key={index}>
                <strong>Paragraph {entry.paragraph || index + 1}:</strong>{" "}
                {entry.comment}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.correctedSentences.length > 0 && (
        <div className="mt-5">
          <h4 className="font-semibold">Sentence corrections</h4>
          <ul className="mt-2 space-y-3 text-sm">
            {result.correctedSentences.map((entry, index) => (
              <li
                key={index}
                className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <p>
                  <span className="text-red-700 line-through dark:text-red-300">
                    {entry.original}
                  </span>
                </p>
                <p className="mt-1 font-medium text-green-700 dark:text-green-300">
                  {entry.corrected}
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {entry.explanation}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.vocabularyUpgrades.length > 0 && (
        <div className="mt-5">
          <h4 className="font-semibold">Vocabulary upgrades</h4>
          <ul className="mt-2 space-y-2 text-sm">
            {result.vocabularyUpgrades.map((entry, index) => (
              <li key={index}>
                <span className="line-through">{entry.original}</span> →{" "}
                <strong>{entry.upgrade}</strong>
                {entry.example ? (
                  <span className="text-slate-600 dark:text-slate-300">
                    {" "}
                    — “{entry.example}”
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.modelAnswer && (
        <div className="mt-5">
          <h4 className="font-semibold">Band 7+ model answer</h4>
          <div className="mt-2 space-y-3 whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-4 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900">
            {result.modelAnswer}
          </div>
        </div>
      )}
    </section>
  );
}

export type ModuleResult = {
  module: "listening" | "reading" | "writing" | "speaking";
  band: number;
};

export default function WritingExam({
  test,
  onComplete,
}: {
  test: IELTSTest;
  onComplete?: (result: ModuleResult) => void;
}) {
  const [task1Text, setTask1Text] = useState("");
  const [task2Text, setTask2Text] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [result1, setResult1] = useState<TaskResult | null>(null);
  const [result2, setResult2] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const task1Words = countWords(task1Text);
  const task2Words = countWords(task2Text);
  const task1Min = test.writing.task1.minWords;
  const task2Min = test.writing.task2.minWords;

  const saveAttempt = useCallback(
    async (r1: TaskResult | null, r2: TaskResult | null) => {
      const overall =
        r1 && r2 ? writingOverallBand(r1.overallBand, r2.overallBand) : null;
      const payload = {
        testId: test.id,
        module: "writing",
        band: overall,
        task1: r1,
        task2: r2,
        savedAt: new Date().toISOString(),
      };
      try {
        if (isSupabaseConfigured()) {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            const { error: insertError } = await supabase
              .from("test_attempts")
              .insert({
                user_id: session.user.id,
                test_id: test.id,
                module: "writing",
                band: overall,
                answers: { task1: task1Text, task2: task2Text },
                feedback: { task1: r1, task2: r2 },
              });
            if (insertError) throw insertError;
            setSaveStatus("Attempt saved to your account.");
            return;
          }
        }
      } catch {
        // Fall through to the localStorage backup below.
      }
      try {
        window.localStorage.setItem(
          `ielts-attempt-writing-${test.id}`,
          JSON.stringify(payload)
        );
        setSaveStatus("Attempt saved on this device.");
      } catch {
        setSaveStatus("Could not save this attempt.");
      }
    },
    [test.id, task1Text, task2Text]
  );

  const submit = useCallback(async () => {
    if (submitted || marking) return;
    setMarking(true);
    setError(null);
    try {
      const markOne = async (
        task: "task1" | "task2",
        text: string
      ): Promise<TaskResult> => {
        const response = await fetch("/api/ai/mark-writing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId: test.id, task, text }),
        });
        const data = (await response.json()) as Record<string, unknown>;
        if (!response.ok) {
          throw new Error(
            typeof data.message === "string"
              ? data.message
              : "AI marking failed. Please try again."
          );
        }
        return data as unknown as TaskResult;
      };
      const [r1, r2] = await Promise.all([
        markOne("task1", task1Text),
        markOne("task2", task2Text),
      ]);
      setResult1(r1);
      setResult2(r2);
      setSubmitted(true);
      setConfirming(false);
      await saveAttempt(r1, r2);
      onComplete?.({
        module: "writing",
        band: writingOverallBand(r1.overallBand, r2.overallBand),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "AI marking failed. Please try again."
      );
    } finally {
      setMarking(false);
    }
  }, [submitted, marking, test.id, task1Text, task2Text, saveAttempt, onComplete]);

  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (submitted) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          void submitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [submitted]);

  const runOcr = useCallback(
    async (taskKey: "task1" | "task2", file: File) => {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setOcrStatus((prev) => ({
          ...prev,
          [taskKey]:
            "PDFs cannot be read directly — please convert the PDF page to an image (jpg/png) first, then upload the image.",
        }));
        return;
      }
      setOcrStatus((prev) => ({
        ...prev,
        [taskKey]: "Reading your handwriting… this can take a minute.",
      }));
      try {
        const Tesseract = (await import("tesseract.js")).default;
        const result = await Tesseract.recognize(file, "eng");
        const extracted = result.data.text.trim();
        if (!extracted) {
          setOcrStatus((prev) => ({
            ...prev,
            [taskKey]:
              "No text could be read from that image. Try a clearer photo with good light.",
          }));
          return;
        }
        if (taskKey === "task1") setTask1Text(extracted);
        else setTask2Text(extracted);
        setOcrStatus((prev) => ({
          ...prev,
          [taskKey]:
            "Text extracted — please check it and correct any reading mistakes before submitting.",
        }));
      } catch {
        setOcrStatus((prev) => ({
          ...prev,
          [taskKey]:
            "Handwriting reading failed for this image. Please type your answer instead.",
        }));
      }
    },
    []
  );

  const timeIsLow = secondsLeft <= 5 * 60;

  /* ------------------------------ Results view ------------------------------ */
  if (submitted && result1 && result2) {
    const overall = writingOverallBand(result1.overallBand, result2.overallBand);
    const improvements = [...result1.improvementPlan, ...result2.improvementPlan].slice(0, 6);
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Writing results</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {test.title} · {test.track === "academic" ? "Academic" : "General Training"}
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Overall Writing band — Task 1 + Task 2 (Task 2 counts double)
          </p>
          <p className="mt-1 font-mono text-4xl font-bold">{overall.toFixed(1)}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Task 1: {result1.overallBand.toFixed(1)} · Task 2:{" "}
            {result2.overallBand.toFixed(1)}
          </p>
        </div>

        {saveStatus && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{saveStatus}</p>
        )}

        <div className="mt-8 space-y-8">
          <TaskReport title="Task 1" result={result1} />
          <TaskReport title="Task 2" result={result2} />
        </div>

        {improvements.length > 0 && (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold">3 specific improvements</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
              {improvements.slice(0, 3).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{DISCLAIMER}</p>
      </div>
    );
  }

  /* ------------------------------- Exam view -------------------------------- */
  const task1 = test.writing.task1;
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Writing · {test.track === "academic" ? "Academic" : "General Training"} ·
            60 minutes · Task 1 + Task 2
          </p>
        </div>
        <div
          className={`rounded-lg border px-4 py-2 text-center ${
            timeIsLow
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
              : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          }`}
          role="timer"
          aria-live="polite"
          aria-label={`Time remaining: ${formatTime(secondsLeft)}`}
        >
          <p className="text-xs uppercase tracking-wide">Time left</p>
          <p className="font-mono text-2xl font-bold">{formatTime(secondsLeft)}</p>
        </div>
      </header>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Suggested time: 20 minutes for Task 1, 40 minutes for Task 2. The test
        submits automatically when the timer reaches 0:00.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <div className="mt-6 space-y-8">
        {/* ------------------------------ Task 1 ------------------------------ */}
        <section
          aria-label="Writing Task 1"
          className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">
            Task 1 — {task1.type === "letter" ? "Letter" : "Chart / diagram"} · about
            20 minutes · at least {task1Min} words
          </h2>
          <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-200">
            {task1.prompt}
          </p>
          {task1.type !== "letter" && task1.chartDescription && (
            <div className="mt-3 rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-800">
              <p className="font-semibold">Chart data</p>
              <p className="mt-1 text-slate-700 dark:text-slate-200">
                {task1.chartDescription}
              </p>
            </div>
          )}
          {task1.type === "letter" && task1.chartDescription && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {task1.chartDescription}
            </p>
          )}

          <label
            htmlFor="task1-answer"
            className="mt-4 block text-sm font-semibold"
          >
            Your answer — Task 1
          </label>
          <textarea
            id="task1-answer"
            value={task1Text}
            onChange={(event) => setTask1Text(event.target.value)}
            rows={10}
            placeholder="Type your Task 1 answer here, or upload a photo of your handwritten answer below…"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800"
          />
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {task1Words} words · minimum {task1Min}
            {task1Words < task1Min ? " — under length" : " ✓"}
          </p>

          <div className="mt-3">
            <label
              htmlFor="task1-ocr"
              className="block text-sm font-medium"
            >
              Handwritten option — upload a photo of your handwritten Task 1
              (jpg/png)
            </label>
            <input
              id="task1-ocr"
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void runOcr("task1", file);
                event.target.value = "";
              }}
              className="mt-1 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              The photo is read on your device. PDFs cannot be read directly —
              convert the PDF page to an image first.
            </p>
            {ocrStatus.task1 && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {ocrStatus.task1}
              </p>
            )}
          </div>
        </section>

        {/* ------------------------------ Task 2 ------------------------------ */}
        <section
          aria-label="Writing Task 2"
          className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">
            Task 2 — Essay · about 40 minutes · at least {task2Min} words
          </h2>
          <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-200">
            {test.writing.task2.prompt}
          </p>

          <label
            htmlFor="task2-answer"
            className="mt-4 block text-sm font-semibold"
          >
            Your answer — Task 2
          </label>
          <textarea
            id="task2-answer"
            value={task2Text}
            onChange={(event) => setTask2Text(event.target.value)}
            rows={14}
            placeholder="Type your Task 2 essay here, or upload a photo of your handwritten essay below…"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800"
          />
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {task2Words} words · minimum {task2Min}
            {task2Words < task2Min ? " — under length" : " ✓"}
          </p>

          <div className="mt-3">
            <label
              htmlFor="task2-ocr"
              className="block text-sm font-medium"
            >
              Handwritten option — upload a photo of your handwritten Task 2
              (jpg/png)
            </label>
            <input
              id="task2-ocr"
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void runOcr("task2", file);
                event.target.value = "";
              }}
              className="mt-1 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              The photo is read on your device. PDFs cannot be read directly —
              convert the PDF page to an image first.
            </p>
            {ocrStatus.task2 && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {ocrStatus.task2}
              </p>
            )}
          </div>
        </section>

        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Task 1: {task1Words} / {task1Min} words · Task 2: {task2Words} /{" "}
            {task2Min} words. Both answers are sent for AI marking when you
            submit.
          </p>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={marking}
              className="mt-3 w-full rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Submit for marking
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold">
                Submit now? You cannot change your answers after submitting.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={marking}
                  className="flex-1 rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  {marking ? "Marking… please wait" : "Yes, submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={marking}
                  className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 font-semibold hover:bg-slate-100 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  Keep working
                </button>
              </div>
            </div>
          )}
          {marking && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              The AI examiner is reading both answers… this can take up to a
              minute.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
