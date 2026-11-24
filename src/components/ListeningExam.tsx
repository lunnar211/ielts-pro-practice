"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { markListening, type ListeningResult } from "@/lib/listening";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { IELTSTest, ListeningSection } from "@/lib/types";

const LISTENING_SECONDS = 30 * 60;
const TRANSFER_SECONDS = 10 * 60;

type Phase = "listening" | "transfer" | "results";

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Split a transcript into speakable chunks (sentence groups) so long readings do not stall. */
function chunkTranscript(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (current.length + trimmed.length > 900 && current) {
      chunks.push(current);
      current = trimmed;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

export type ModuleResult = {
  module: "listening" | "reading" | "writing" | "speaking";
  band: number;
};

export default function ListeningExam({
  test,
  onComplete,
}: {
  test: IELTSTest;
  onComplete?: (result: ModuleResult) => void;
}) {
  const [phase, setPhase] = useState<Phase>("listening");
  const [secondsLeft, setSecondsLeft] = useState(LISTENING_SECONDS);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [played, setPlayed] = useState<Record<string, boolean>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [result, setResult] = useState<ListeningResult | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const furthestTimeRef = useRef(0);
  const submittedRef = useRef(false);
  const ttsChunksLeftRef = useRef(0);

  const sections = test.listening.sections;
  const allPlayed = sections.every((s) => played[s.id]);
  const answeredCount = Object.values(answers).filter(
    (a) => a.trim().length > 0
  ).length;
  const totalQuestions = sections.reduce((n, s) => n + s.questions.length, 0);

  const stopPlayback = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    ttsChunksLeftRef.current = 0;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    furthestTimeRef.current = 0;
    setPlayingId(null);
  }, []);

  // Stop any playback when the component unmounts.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audio) audio.pause();
    };
  }, []);

  const saveAttempt = useCallback(
    async (marking: ListeningResult) => {
      const payload = {
        module: "listening",
        raw_score: marking.raw,
        band: marking.band,
        answers,
        feedback: { perQuestion: marking.perQuestion },
      };
      const localKey = `ielts-attempt-listening-${test.id}`;
      try {
        if (isSupabaseConfigured()) {
          const supabase = createClient();
          const { error } = await supabase
            .from("test_attempts")
            .insert(payload);
          if (error) throw error;
          setSaveNote("Attempt saved.");
        } else {
          window.localStorage.setItem(
            localKey,
            JSON.stringify({ ...payload, savedAt: new Date().toISOString() })
          );
          setSaveNote("Attempt saved on this device.");
        }
      } catch {
        // Never crash the results view: fall back to local storage.
        try {
          window.localStorage.setItem(
            localKey,
            JSON.stringify({ ...payload, savedAt: new Date().toISOString() })
          );
          setSaveNote("Attempt saved on this device.");
        } catch {
          setSaveNote("Could not save this attempt.");
        }
      }
    },
    [answers, test.id]
  );

  const submit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    stopPlayback();
    const marking = markListening(test, answers);
    setResult(marking);
    setPhase("results");
    setConfirmingSubmit(false);
    void saveAttempt(marking);
    onComplete?.({ module: "listening", band: marking.band });
  }, [answers, saveAttempt, stopPlayback, test, onComplete]);

  // Countdown: one interval while the exam is running.
  useEffect(() => {
    if (phase === "results") return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Phase transitions when the clock hits zero.
  useEffect(() => {
    if (secondsLeft !== 0 || phase === "results") return;
    if (phase === "listening") {
      stopPlayback();
      setPhase("transfer");
      setSecondsLeft(TRANSFER_SECONDS);
    } else if (phase === "transfer") {
      submit();
    }
  }, [secondsLeft, phase, stopPlayback, submit]);

  const beginTransfer = useCallback(() => {
    stopPlayback();
    setPhase("transfer");
    setSecondsLeft(TRANSFER_SECONDS);
  }, [stopPlayback]);

  const playWithAudio = useCallback(
    (section: ListeningSection) => {
      const audio = audioRef.current;
      if (!audio || !section.audioUrl) return;
      furthestTimeRef.current = 0;
      audio.src = section.audioUrl;
      setPlayed((prev) => ({ ...prev, [section.id]: true }));
      setPlayingId(section.id);
      void audio.play().catch(() => setPlayingId(null));
    },
    []
  );

  const playWithTts = useCallback((section: ListeningSection) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const chunks = chunkTranscript(section.transcript);
    ttsChunksLeftRef.current = chunks.length;
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang.toLowerCase().startsWith("en-gb")) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
      null;

    // Mark as played as soon as playback starts: there is no replay.
    let started = false;
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.rate = 0.95;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        if (!started) {
          started = true;
          setPlayed((prev) => ({ ...prev, [section.id]: true }));
          setPlayingId(section.id);
        }
      };
      utterance.onend = () => {
        ttsChunksLeftRef.current -= 1;
        if (ttsChunksLeftRef.current <= 0 && index === chunks.length - 1) {
          setPlayingId(null);
        }
      };
      utterance.onerror = () => {
        ttsChunksLeftRef.current -= 1;
        if (ttsChunksLeftRef.current <= 0) setPlayingId(null);
      };
      synth.speak(utterance);
    });
  }, []);

  const playSection = useCallback(
    (section: ListeningSection) => {
      if (phase !== "listening" || played[section.id] || playingId !== null) return;
      if (section.audioUrl) {
        playWithAudio(section);
      } else {
        playWithTts(section);
      }
    },
    [phase, played, playingId, playWithAudio, playWithTts]
  );

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // ---- Results view ----
  if (phase === "results" && result) {
    const resultById = new Map(result.perQuestion.map((p) => [p.id, p]));
    let questionNumber = 0;
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/practice/listening"
          className="text-sm font-medium text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-brand-400"
        >
          ← Back to Listening tests
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
          Listening results — {test.title}
        </h1>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">Raw score</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
              {result.raw} / 40
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">Band score</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
              {result.band}
            </p>
          </div>
        </div>
        {saveNote && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{saveNote}</p>
        )}

        {sections.map((section) => (
          <section
            key={section.id}
            className="mt-10 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Section {section.number}: {section.title}
            </h2>
            <ol className="mt-4 space-y-4">
              {section.questions.map((question) => {
                questionNumber += 1;
                const item = resultById.get(question.id);
                return (
                  <li
                    key={question.id}
                    className="rounded-md border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <p className="font-medium text-slate-900 dark:text-white">
                      <span className="mr-2 text-slate-500 dark:text-slate-400">
                        Q{questionNumber}
                      </span>
                      {question.prompt}
                    </p>
                    <p className="mt-2 text-sm">
                      <span
                        className={
                          item?.correct
                            ? "font-semibold text-green-700 dark:text-green-400"
                            : "font-semibold text-red-700 dark:text-red-400"
                        }
                      >
                        {item?.correct ? "Correct" : "Incorrect"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      Your answer:{" "}
                      <span className="font-medium">
                        {item?.userAnswer?.trim() ? item.userAnswer : "— no answer —"}
                      </span>
                    </p>
                    {!item?.correct && (
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        Correct answer:{" "}
                        <span className="font-medium">{item?.correctAnswer}</span>
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            <details className="mt-5" open>
              <summary className="cursor-pointer text-sm font-medium text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-brand-400">
                Transcript for review
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {section.transcript}
              </p>
            </details>
          </section>
        ))}
      </div>
    );
  }

  // ---- Exam view ----
  const timerUrgent = secondsLeft <= 60;
  let questionNumber = 0;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Hidden audio element: real recordings play once, with no controls and no seeking. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onEnded={() => setPlayingId(null)}
        onTimeUpdate={(e) => {
          furthestTimeRef.current = Math.max(
            furthestTimeRef.current,
            e.currentTarget.currentTime
          );
        }}
        onSeeking={(e) => {
          // No rewind (and no skipping ahead): pin playback to the furthest point reached.
          if (e.currentTarget.currentTime < furthestTimeRef.current) {
            e.currentTarget.currentTime = furthestTimeRef.current;
          }
        }}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Listening — {test.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {phase === "listening"
              ? "Listen to each section once, then answer the questions."
              : "Answer transfer time — you can still edit your answers, but no audio will play."}
          </p>
        </div>
        <div
          className={`rounded-lg border px-4 py-2 text-center ${
            timerUrgent
              ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
              : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          }`}
          role="timer"
          aria-live="off"
          aria-label={
            phase === "listening"
              ? "Listening time remaining"
              : "Answer transfer time remaining"
          }
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {phase === "listening" ? "Listening" : "Answer transfer"}
          </p>
          <p
            className={`text-2xl font-bold tabular-nums ${
              timerUrgent
                ? "text-red-700 dark:text-red-400"
                : "text-slate-900 dark:text-white"
            }`}
          >
            {formatTime(secondsLeft)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Answered: {answeredCount} / {totalQuestions} · Sections played:{" "}
        {sections.filter((s) => played[s.id]).length} / {sections.length}
      </p>

      {sections.map((section) => {
        const isPlayed = Boolean(played[section.id]);
        const isPlaying = playingId === section.id;
        const playDisabled =
          phase !== "listening" || isPlayed || playingId !== null;
        return (
          <section
            key={section.id}
            aria-labelledby={`section-${section.id}-heading`}
            className="mt-8 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2
                id={`section-${section.id}-heading`}
                className="text-lg font-semibold text-slate-900 dark:text-white"
              >
                Section {section.number}: {section.title}
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {isPlaying
                  ? "Playing…"
                  : isPlayed
                    ? "Played — no replay"
                    : "Not played yet"}
              </span>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => playSection(section)}
                disabled={playDisabled}
                className="rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPlaying
                  ? "Playing…"
                  : isPlayed
                    ? "Played"
                    : phase === "transfer"
                      ? "Audio closed — transfer time"
                      : `Play Section ${section.number}`}
              </button>
              {!section.audioUrl && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Practice audio — text-to-speech reading of the transcript.
                  Upload a real recording in the Admin panel for the full exam
                  experience.
                </p>
              )}
              {phase === "transfer" && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Transfer time: check and edit your answers below.
                </p>
              )}
            </div>

            <ol className="mt-6 space-y-6">
              {section.questions.map((question) => {
                questionNumber += 1;
                const value = answers[question.id] ?? "";
                const labelId = `${question.id}-label`;
                return (
                  <li key={question.id}>
                    <p
                      id={labelId}
                      className="font-medium text-slate-900 dark:text-white"
                    >
                      <span className="mr-2 text-slate-500 dark:text-slate-400">
                        Q{questionNumber}
                      </span>
                      {question.prompt}
                    </p>

                    {question.type === "mcq" && question.options && (
                      <fieldset className="mt-3">
                        <legend className="sr-only">
                          Question {questionNumber} options
                        </legend>
                        <div className="space-y-2">
                          {question.options.map((option) => (
                            <label
                              key={option}
                              className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-slate-800 hover:border-brand-500 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-400 dark:has-[:checked]:border-brand-400 dark:has-[:checked]:bg-brand-950"
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={option}
                                checked={value === option}
                                onChange={() => setAnswer(question.id, option)}
                                className="mt-1 accent-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}

                    {question.type === "completion" && (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setAnswer(question.id, e.target.value)}
                        aria-labelledby={labelId}
                        placeholder="Type your answer"
                        autoComplete="off"
                        className="mt-3 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                    )}

                    {(question.type === "matching" ||
                      question.type === "labelling") &&
                      question.options && (
                        <select
                          value={value}
                          onChange={(e) => setAnswer(question.id, e.target.value)}
                          aria-labelledby={labelId}
                          className="mt-3 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-600 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="">Choose an answer</option>
                          {question.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        {phase === "listening" && (
          <button
            type="button"
            onClick={beginTransfer}
            disabled={!allPlayed}
            title={
              allPlayed
                ? "Start the 10-minute answer transfer time"
                : "Play all 4 sections first"
            }
            className="rounded-md bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          >
            Begin answer transfer
          </button>
        )}
        {phase === "listening" && !allPlayed && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Play all 4 sections to start transfer time early — or wait for the
            30-minute clock to finish.
          </p>
        )}
        {phase === "transfer" && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Transfer time ends automatically at 0:00. You can submit early.
          </p>
        )}

        {!confirmingSubmit ? (
          <button
            type="button"
            onClick={() => setConfirmingSubmit(true)}
            className="ml-auto rounded-md bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Submit
          </button>
        ) : (
          <div
            className="ml-auto flex flex-wrap items-center gap-3"
            role="group"
            aria-label="Confirm submission"
          >
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Submit now? You cannot change answers after submitting.
            </p>
            <button
              type="button"
              onClick={submit}
              className="rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Yes, submit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingSubmit(false)}
              className="rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Keep working
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
