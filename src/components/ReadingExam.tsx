"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IELTSTest, ReadingQuestion } from "@/lib/types";
import { markReading, type ReadingMarking } from "@/lib/reading";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const EXAM_SECONDS = 60 * 60;

const TFNG_OPTIONS = ["True", "False", "Not Given"];
const YNNG_OPTIONS = ["Yes", "No", "Not Given"];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Render paragraph text, wrapping any highlighted phrases in <mark>. */
function renderHighlighted(
  text: string,
  highlights: string[]
): React.ReactNode {
  const phrases = highlights.filter((h) => h.length > 0);
  if (phrases.length === 0) return text;
  const pattern = new RegExp(`(${phrases.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, index) =>
    phrases.some((h) => h.toLowerCase() === part.toLowerCase()) ? (
      <mark
        key={index}
        className="rounded-sm bg-yellow-200 px-0.5 text-slate-900 dark:bg-yellow-500/70 dark:text-yellow-50"
      >
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

function questionLabel(question: ReadingQuestion, index: number): string {
  return `Question ${index + 1}`;
}

export type ModuleResult = {
  module: "listening" | "reading" | "writing" | "speaking";
  band: number;
};

export default function ReadingExam({
  test,
  onComplete,
}: {
  test: IELTSTest;
  onComplete?: (result: ModuleResult) => void;
}) {
  const totalQuestions = useMemo(
    () =>
      test.reading.passages.reduce(
        (count, passage) => count + passage.questions.length,
        0
      ),
    [test]
  );

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ReadingMarking | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [highlights, setHighlights] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const answeredCount = useMemo(
    () =>
      Object.values(answers).filter((value) => value.trim().length > 0).length,
    [answers]
  );

  const saveAttempt = useCallback(
    async (marking: ReadingMarking) => {
      const localKey = `ielts-attempt-reading-${test.id}`;
      try {
        if (isSupabaseConfigured()) {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            const { error } = await supabase.from("test_attempts").insert({
              user_id: session.user.id,
              test_id: test.id,
              module: "reading",
              raw_score: marking.raw,
              band: marking.band,
              answers,
              feedback: { perQuestion: marking.perQuestion },
            });
            if (error) throw error;
            setSaveStatus("Attempt saved to your account.");
            return;
          }
        }
      } catch {
        // Fall through to the localStorage backup below.
      }
      try {
        window.localStorage.setItem(
          localKey,
          JSON.stringify({
            testId: test.id,
            module: "reading",
            rawScore: marking.raw,
            band: marking.band,
            answers,
            perQuestion: marking.perQuestion,
            savedAt: new Date().toISOString(),
          })
        );
        setSaveStatus("Attempt saved on this device.");
      } catch {
        setSaveStatus("Could not save this attempt.");
      }
    },
    [answers, test.id]
  );

  const submit = useCallback(() => {
    if (submitted) return;
    const marking = markReading(test, answers);
    setResult(marking);
    setSubmitted(true);
    setConfirming(false);
    void saveAttempt(marking);
    onComplete?.({ module: "reading", band: marking.band });
  }, [submitted, test, answers, saveAttempt, onComplete]);

  // Keep a ref to the latest submit so the timer can call it without
  // re-creating the interval on every keystroke.
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (submitted) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          submitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [submitted]);

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const highlightSelection = useCallback((passageId: string) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? "";
    if (selectedText.length === 0) return;
    setHighlights((prev) => {
      const existing = prev[passageId] ?? [];
      if (existing.some((h) => h.toLowerCase() === selectedText.toLowerCase())) {
        return prev;
      }
      return { ...prev, [passageId]: [...existing, selectedText] };
    });
    selection?.removeAllRanges();
  }, []);

  const clearHighlights = useCallback((passageId: string) => {
    setHighlights((prev) => ({ ...prev, [passageId]: [] }));
  }, []);

  const timeIsLow = secondsLeft <= 5 * 60;

  /* ------------------------------ Results view ------------------------------ */
  if (submitted && result) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Reading results</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {test.title} ·{" "}
          {test.track === "academic" ? "Academic" : "General Training"}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Raw score
            </p>
            <p className="mt-1 text-3xl font-bold">
              {result.raw} / {totalQuestions}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Band score
            </p>
            <p className="mt-1 text-3xl font-bold">
              {result.band.toFixed(1)}
            </p>
          </div>
        </div>

        {saveStatus && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {saveStatus}
          </p>
        )}

        <h2 className="mt-10 text-xl font-semibold">Question review</h2>
        <div className="mt-4 space-y-8">
          {test.reading.passages.map((passage) => (
            <section key={passage.id} aria-label={passage.title}>
              <h3 className="text-lg font-semibold">{passage.title}</h3>
              <ol className="mt-3 space-y-4">
                {passage.questions.map((question, index) => {
                  const review = result.perQuestion.find(
                    (entry) => entry.id === question.id
                  );
                  if (!review) return null;
                  return (
                    <li
                      key={question.id}
                      className={`rounded-lg border p-4 ${
                        review.correct
                          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40"
                          : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40"
                      }`}
                    >
                      <p className="font-medium">
                        <span
                          className={
                            review.correct
                              ? "text-green-700 dark:text-green-300"
                              : "text-red-700 dark:text-red-300"
                          }
                        >
                          {review.correct ? "✓ Correct" : "✗ Incorrect"}
                        </span>{" "}
                        — {questionLabel(question, index)} · {question.id}
                      </p>
                      <p className="mt-2 text-slate-700 dark:text-slate-200">
                        {question.prompt}
                      </p>
                      <dl className="mt-3 space-y-1 text-sm">
                        <div className="flex gap-2">
                          <dt className="font-semibold">Your answer:</dt>
                          <dd>
                            {review.userAnswer.trim().length > 0
                              ? review.userAnswer
                              : "— not answered —"}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-semibold">Correct answer:</dt>
                          <dd>{review.correctAnswer}</dd>
                        </div>
                      </dl>
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Evidence: </span>
                        “{review.evidence}”
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------------- Exam view -------------------------------- */
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Reading · {test.track === "academic" ? "Academic" : "General Training"} ·{" "}
            {totalQuestions} questions · 60 minutes
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
          <p className="font-mono text-2xl font-bold">
            {formatTime(secondsLeft)}
          </p>
        </div>
      </header>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Answered {answeredCount} of {totalQuestions}. The test submits
        automatically when the timer reaches 0:00 — there is no pause.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ---------------------------- Passages ---------------------------- */}
        <div className="space-y-8">
          {test.reading.passages.map((passage, passageIndex) => (
            <article
              key={passage.id}
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
            >
              <h2 className="text-lg font-semibold">
                Passage {passageIndex + 1}: {passage.title}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => highlightSelection(passage.id)}
                  className="rounded-md bg-yellow-400 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500"
                >
                  Highlight selection
                </button>
                {(highlights[passage.id]?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => clearHighlights(passage.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    Clear highlights
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Select text in the passage, then click “Highlight selection”.
              </p>

              <div className="mt-3 space-y-4 leading-relaxed text-slate-800 dark:text-slate-100">
                {passage.text.split("\n\n").map((paragraph, index) => (
                  <p key={index}>
                    {renderHighlighted(paragraph, highlights[passage.id] ?? [])}
                  </p>
                ))}
              </div>

              <div className="mt-5">
                <label
                  htmlFor={`notes-${passage.id}`}
                  className="block text-sm font-semibold"
                >
                  My notes — {passage.title}
                </label>
                <textarea
                  id={`notes-${passage.id}`}
                  value={notes[passage.id] ?? ""}
                  onChange={(event) =>
                    setNotes((prev) => ({
                      ...prev,
                      [passage.id]: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Write your own notes for this passage…"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </article>
          ))}
        </div>

        {/* ---------------------------- Questions ---------------------------- */}
        <div className="space-y-8">
          {test.reading.passages.map((passage, passageIndex) => (
            <section
              key={passage.id}
              aria-label={`Questions for ${passage.title}`}
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
            >
              <h2 className="text-lg font-semibold">
                Questions — Passage {passageIndex + 1}: {passage.title}
              </h2>
              <ol className="mt-4 space-y-6">
                {passage.questions.map((question, index) => (
                  <li key={question.id}>
                    <fieldset>
                      <legend className="text-sm font-medium leading-relaxed">
                        <span className="font-bold">
                          {questionLabel(question, index)} · {question.id}
                        </span>{" "}
                        — {question.prompt}
                      </legend>
                      <div className="mt-2">
                        {question.type === "tfng" && (
                          <div className="flex flex-wrap gap-4">
                            {TFNG_OPTIONS.map((option) => (
                              <label
                                key={option}
                                className="flex cursor-pointer items-center gap-1.5 text-sm"
                              >
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={option}
                                  checked={answers[question.id] === option}
                                  onChange={() =>
                                    setAnswer(question.id, option)
                                  }
                                  className="h-4 w-4 accent-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        )}

                        {question.type === "ynng" && (
                          <div className="flex flex-wrap gap-4">
                            {YNNG_OPTIONS.map((option) => (
                              <label
                                key={option}
                                className="flex cursor-pointer items-center gap-1.5 text-sm"
                              >
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={option}
                                  checked={answers[question.id] === option}
                                  onChange={() =>
                                    setAnswer(question.id, option)
                                  }
                                  className="h-4 w-4 accent-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        )}

                        {(question.type === "matching-headings" ||
                          question.type === "matching-information" ||
                          question.type === "matching-features") && (
                          <label className="block">
                            <span className="sr-only">
                              Choose an answer for {question.id}
                            </span>
                            <select
                              value={answers[question.id] ?? ""}
                              onChange={(event) =>
                                setAnswer(question.id, event.target.value)
                              }
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800"
                            >
                              <option value="">Select an answer…</option>
                              {(question.options ?? []).map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        {question.type === "mcq" && (
                          <div className="space-y-2">
                            {(question.options ?? []).map((option) => (
                              <label
                                key={option}
                                className="flex cursor-pointer items-start gap-2 text-sm"
                              >
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={option}
                                  checked={answers[question.id] === option}
                                  onChange={() =>
                                    setAnswer(question.id, option)
                                  }
                                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {(question.type === "completion" ||
                          question.type === "short-answer") && (
                          <label className="block">
                            <span className="sr-only">
                              Your answer for {question.id}
                            </span>
                            <input
                              type="text"
                              value={answers[question.id] ?? ""}
                              onChange={(event) =>
                                setAnswer(question.id, event.target.value)
                              }
                              autoComplete="off"
                              placeholder="Type your answer…"
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800"
                            />
                          </label>
                        )}
                      </div>
                    </fieldset>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You have answered {answeredCount} of {totalQuestions} questions.
              {totalQuestions - answeredCount > 0 &&
                ` ${totalQuestions - answeredCount} still unanswered.`}
            </p>
            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-3 w-full rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Submit answers
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold">
                  Submit now? You cannot change your answers after submitting.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={submit}
                    className="flex-1 rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    Yes, submit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 font-semibold hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    Keep working
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
