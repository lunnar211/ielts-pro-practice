"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IELTSTest } from "@/lib/types";
import type { SpeakingMarkingResult } from "@/lib/prompts";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const GUIDE_SECONDS = 14 * 60;
const PART2_PREP_SECONDS = 60;
const PART2_MAX_SECONDS = 120;
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

function countFillers(text: string): number {
  const matches = text.match(/\b(uh|um|er|you know|like)\b/gi);
  return matches ? matches.length : 0;
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

type Stage = "part1" | "part2" | "part3" | "report";

interface SpeakingReport extends SpeakingMarkingResult {
  disclaimer?: string;
}

export type ModuleResult = {
  module: "listening" | "reading" | "writing" | "speaking";
  band: number;
};

export default function SpeakingExam({
  test,
  onComplete,
}: {
  test: IELTSTest;
  onComplete?: (result: ModuleResult) => void;
}) {
  const part1Questions = test.speaking.part1;
  const part3Questions = test.speaking.part3;

  const [stage, setStage] = useState<Stage>("part1");
  const [part1Index, setPart1Index] = useState(0);
  const [part3Index, setPart3Index] = useState(0);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(PART2_PREP_SECONDS);
  const [prepRunning, setPrepRunning] = useState(false);
  const [guideSecondsLeft, setGuideSecondsLeft] = useState(GUIDE_SECONDS);

  const [marking, setMarking] = useState(false);
  const [report, setReport] = useState<SpeakingReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef(0);
  const recordingKeyRef = useRef<string | null>(null);
  const recordTimerRef = useRef<number | null>(null);

  const combinedTranscript = Object.values(transcripts)
    .map((t) => t.trim())
    .filter(Boolean)
    .join(" ");
  const totalSeconds = Object.values(durations).reduce((sum, d) => sum + d, 0);
  const totalWords = countWords(combinedTranscript);
  const wordsPerMinute =
    totalSeconds > 0 ? Math.round(totalWords / (totalSeconds / 60)) : 0;
  const fillerCount = countFillers(combinedTranscript);
  const pauseCount = (combinedTranscript.match(/\.\.\./g) ?? []).length;

  /* --------------------------- Overall guide timer --------------------------- */
  useEffect(() => {
    if (report) return;
    const interval = window.setInterval(() => {
      setGuideSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [report]);

  /* ------------------------------ Prep countdown ----------------------------- */
  useEffect(() => {
    if (!prepRunning) return;
    if (prepSecondsLeft <= 0) {
      setPrepRunning(false);
      return;
    }
    const interval = window.setInterval(() => {
      setPrepSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [prepRunning, prepSecondsLeft]);

  const stopStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  const transcribeBlob = useCallback(
    async (blob: Blob, key: string, durationSeconds: number) => {
      setTranscribing(true);
      setTranscribeError(null);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "answer.webm");
        const response = await fetch("/api/ai/transcribe", {
          method: "POST",
          body: formData,
        });
        const data = (await response.json()) as Record<string, unknown>;
        if (!response.ok) {
          throw new Error(
            typeof data.message === "string"
              ? data.message
              : "Transcription failed. Please try again."
          );
        }
        const transcript =
          typeof data.transcript === "string" ? data.transcript : "";
        setTranscripts((prev) => ({ ...prev, [key]: transcript }));
        const duration =
          typeof data.durationSeconds === "number"
            ? data.durationSeconds
            : durationSeconds;
        setDurations((prev) => ({ ...prev, [key]: duration }));
      } catch (err) {
        setTranscribeError(
          err instanceof Error ? err.message : "Transcription failed."
        );
      } finally {
        setTranscribing(false);
      }
    },
    []
  );

  const startRecording = useCallback(
    async (key: string) => {
      setTranscribeError(null);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setTranscribeError(
          "Microphone access was denied. Allow microphone access, or upload an audio file instead."
        );
        return;
      }
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const elapsed = (Date.now() - recordingStartRef.current) / 1000;
        const stoppedKey = recordingKeyRef.current;
        stopStream();
        setRecordingKey(null);
        if (stoppedKey) void transcribeBlob(blob, stoppedKey, elapsed);
      };
      recordingStartRef.current = Date.now();
      recordingKeyRef.current = key;
      recorder.start();
      setRecordingKey(key);
      setRecordingSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(
          Math.floor((Date.now() - recordingStartRef.current) / 1000)
        );
      }, 500);
    },
    [stopStream, transcribeBlob]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Auto-stop Part 2 recording at the 2-minute limit.
  useEffect(() => {
    if (recordingKey === "part2" && recordingSeconds >= PART2_MAX_SECONDS) {
      stopRecording();
    }
  }, [recordingKey, recordingSeconds, stopRecording]);

  // Stop any recording when the component unmounts.
  useEffect(() => stopStream, [stopStream]);

  const speakQuestion = useCallback((question: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(question));
  }, []);

  const handleUpload = useCallback(
    async (key: string, file: File) => {
      setTranscribeError(null);
      const duration = await getAudioDuration(file);
      await transcribeBlob(file, key, duration);
    },
    [transcribeBlob]
  );

  const saveAttempt = useCallback(
    async (speakingReport: SpeakingReport) => {
      const payload = {
        testId: test.id,
        module: "speaking",
        band: speakingReport.overallBand,
        transcript: combinedTranscript,
        report: speakingReport,
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
                module: "speaking",
                band: speakingReport.overallBand,
                answers: transcripts,
                feedback: { report: speakingReport, transcript: combinedTranscript },
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
          `ielts-attempt-speaking-${test.id}`,
          JSON.stringify(payload)
        );
        setSaveStatus("Attempt saved on this device.");
      } catch {
        setSaveStatus("Could not save this attempt.");
      }
    },
    [test.id, combinedTranscript, transcripts]
  );

  const submitForMarking = useCallback(async () => {
    if (marking || combinedTranscript.trim().length < 20) return;
    setMarking(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/mark-speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: combinedTranscript,
          part: "Parts 1–3",
          wordsPerMinute,
          fillerCount,
          pauseCount,
        }),
      });
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "AI marking failed. Please try again."
        );
      }
      const speakingReport = data as unknown as SpeakingReport;
      setReport(speakingReport);
      setStage("report");
      await saveAttempt(speakingReport);
      onComplete?.({ module: "speaking", band: speakingReport.overallBand });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "AI marking failed. Please try again."
      );
    } finally {
      setMarking(false);
    }
  }, [marking, combinedTranscript, wordsPerMinute, fillerCount, pauseCount, saveAttempt, onComplete]);

  const uploadInput = (key: string, label: string) => (
    <div className="mt-3">
      <label htmlFor={`upload-${key}`} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={`upload-${key}`}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a"
        disabled={transcribing || recordingKey !== null}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(key, file);
          event.target.value = "";
        }}
        className="mt-1 text-sm"
      />
    </div>
  );

  const recordControls = (key: string) => {
    const isRecording = recordingKey === key;
    const hasTranscript = Boolean(transcripts[key]?.trim());
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={() => void startRecording(key)}
            disabled={transcribing || recordingKey !== null}
            className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            ● Record answer
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-md bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800"
          >
            ■ Stop ({formatTime(recordingSeconds)})
          </button>
        )}
        {hasTranscript && (
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            ✓ Transcript ready
          </span>
        )}
        {isRecording && key === "part2" && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Max 2:00 — recording stops automatically.
          </span>
        )}
      </div>
    );
  };

  const transcriptBox = (key: string) =>
    transcripts[key] ? (
      <div className="mt-3 rounded-md bg-slate-100 p-3 text-sm leading-relaxed dark:bg-slate-800">
        <p className="font-semibold">Transcript</p>
        <p className="mt-1 whitespace-pre-wrap">{transcripts[key]}</p>
      </div>
    ) : null;

  /* ------------------------------ Report view ------------------------------- */
  if (stage === "report" && report) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Speaking results</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {test.title} · {test.track === "academic" ? "Academic" : "General Training"}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">Overall band</p>
            <p className="mt-1 font-mono text-3xl font-bold">{report.overallBand.toFixed(1)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">Words per minute</p>
            <p className="mt-1 font-mono text-3xl font-bold">{report.wordsPerMinute}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">Filler words</p>
            <p className="mt-1 font-mono text-3xl font-bold">{report.fillerWordCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">Long pauses</p>
            <p className="mt-1 font-mono text-3xl font-bold">{report.longPauses}</p>
          </div>
        </div>

        {saveStatus && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{saveStatus}</p>
        )}

        <div className="mt-6 space-y-3">
          {report.criteria.map((criterion) => (
            <div
              key={criterion.name}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">{criterion.name}</h3>
                <span className="font-mono text-xl font-bold">{criterion.band.toFixed(1)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {criterion.justification}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-semibold">Your full transcript</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {combinedTranscript}
          </p>
        </div>

        {report.correctedSentences.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold">Errors in your transcript</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {report.correctedSentences.map((entry, index) => (
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

        {report.betterAnswerExamples.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold">Better answers</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {report.betterAnswerExamples.map((entry, index) => (
                <li
                  key={index}
                  className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <p>
                    <span className="text-slate-500">You said: </span>“{entry.original}”
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Better: </span>“{entry.better}”
                  </p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {entry.explanation}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.followUpQuestions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold">Examiner-style follow-up questions</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
              {report.followUpQuestions.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
          </div>
        )}

        {report.modelAnswer && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold">Band 7+ sample answer</h3>
            <p className="mt-2 whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-4 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900">
              {report.modelAnswer}
            </p>
          </div>
        )}

        <p className="mt-8 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {report.pronunciationNote}
        </p>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{DISCLAIMER}</p>
      </div>
    );
  }

  /* ------------------------------- Exam view -------------------------------- */
  const part1Question = part1Questions[part1Index];
  const part3Question = part3Questions[part3Index];
  const part1Done = Object.keys(transcripts).some((k) => k.startsWith("part1-"));
  const part3Done = Object.keys(transcripts).some((k) => k.startsWith("part3-"));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Speaking · {test.track === "academic" ? "Academic" : "General Training"} ·
            11–14 minutes · Part 1, Part 2, Part 3
          </p>
        </div>
        <div
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-center dark:border-slate-700 dark:bg-slate-900"
          role="timer"
          aria-live="polite"
          aria-label={`Guide time remaining: ${formatTime(guideSecondsLeft)}`}
        >
          <p className="text-xs uppercase tracking-wide">Guide time left</p>
          <p className="font-mono text-2xl font-bold">{formatTime(guideSecondsLeft)}</p>
        </div>
      </header>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Answer out loud. Click “Record answer”, speak, then “Stop” — your
        answer is transcribed automatically. You can also upload an audio file
        (mp3/wav/m4a) instead of recording. The guide timer is a guide only;
        it does not submit anything.
      </p>

      {transcribing && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Transcribing your answer…
        </p>
      )}
      {transcribeError && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {transcribeError}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}

      {/* ------------------------------- Part 1 ------------------------------- */}
      {stage === "part1" && (
        <section
          aria-label="Speaking Part 1"
          className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">
            Part 1 — Interview · 4–5 minutes · Question {part1Index + 1} of{" "}
            {part1Questions.length}
          </h2>
          <p className="mt-3 text-lg leading-relaxed">{part1Question}</p>
          <button
            type="button"
            onClick={() => speakQuestion(part1Question)}
            className="mt-3 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            🔊 Ask me
          </button>
          {recordControls(`part1-${part1Index}`)}
          {uploadInput(
            `part1-${part1Index}`,
            "Or upload an audio file for this question (mp3/wav/m4a)"
          )}
          {transcriptBox(`part1-${part1Index}`)}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPart1Index((i) => Math.min(i + 1, part1Questions.length - 1))}
              disabled={part1Index >= part1Questions.length - 1}
              className="rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Next question
            </button>
            <button
              type="button"
              onClick={() => setStage("part2")}
              disabled={!part1Done}
              className="rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Continue to Part 2 →
            </button>
          </div>
          {!part1Done && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Answer at least one Part 1 question before continuing.
            </p>
          )}
        </section>
      )}

      {/* ------------------------------- Part 2 ------------------------------- */}
      {stage === "part2" && (
        <section
          aria-label="Speaking Part 2"
          className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">Part 2 — Long turn · cue card</h2>
          <div className="mt-3 rounded-md bg-slate-100 p-4 dark:bg-slate-800">
            <p className="font-semibold">{test.speaking.part2.topic}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
              {test.speaking.part2.prompts.map((prompt, index) => (
                <li key={index}>{prompt}</li>
              ))}
            </ul>
          </div>

          {!transcripts.part2 && (
            <div className="mt-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                You have 1 minute to prepare, then up to 2 minutes to speak.
              </p>
              {!prepRunning && prepSecondsLeft === PART2_PREP_SECONDS && (
                <button
                  type="button"
                  onClick={() => setPrepRunning(true)}
                  className="mt-3 rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  Start 1-minute preparation
                </button>
              )}
              {prepRunning && (
                <p className="mt-3 font-mono text-2xl font-bold" role="timer">
                  Preparation: {formatTime(prepSecondsLeft)}
                </p>
              )}
              {!prepRunning && prepSecondsLeft === 0 && (
                <p className="mt-3 text-sm font-semibold">
                  Preparation time is up — record your 2-minute talk now.
                </p>
              )}
            </div>
          )}

          {recordControls("part2")}
          {uploadInput("part2", "Or upload an audio file for Part 2 (mp3/wav/m4a)")}
          {transcriptBox("part2")}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStage("part1")}
              className="rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              ← Back to Part 1
            </button>
            <button
              type="button"
              onClick={() => setStage("part3")}
              disabled={!transcripts.part2}
              className="rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Continue to Part 3 →
            </button>
          </div>
          {!transcripts.part2 && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Record or upload your Part 2 talk before continuing.
            </p>
          )}
        </section>
      )}

      {/* ------------------------------- Part 3 ------------------------------- */}
      {stage === "part3" && (
        <section
          aria-label="Speaking Part 3"
          className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">
            Part 3 — Discussion · Question {part3Index + 1} of {part3Questions.length}
          </h2>
          <p className="mt-3 text-lg leading-relaxed">{part3Question}</p>
          <button
            type="button"
            onClick={() => speakQuestion(part3Question)}
            className="mt-3 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            🔊 Ask me
          </button>
          {recordControls(`part3-${part3Index}`)}
          {uploadInput(
            `part3-${part3Index}`,
            "Or upload an audio file for this question (mp3/wav/m4a)"
          )}
          {transcriptBox(`part3-${part3Index}`)}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPart3Index((i) => Math.min(i + 1, part3Questions.length - 1))}
              disabled={part3Index >= part3Questions.length - 1}
              className="rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Next question
            </button>
            <button
              type="button"
              onClick={() => setStage("part2")}
              className="rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              ← Back to Part 2
            </button>
          </div>
          {!part3Done && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Answer at least one Part 3 question before getting your report.
            </p>
          )}
        </section>
      )}

      {/* --------------------------- Submit for marking ------------------------ */}
      {stage !== "report" && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Answered parts so far: {Object.keys(transcripts).length} ·{" "}
            {totalWords} words spoken
            {totalSeconds > 0 ? ` · about ${wordsPerMinute} words per minute` : ""} ·{" "}
            {fillerCount} filler words counted.
          </p>
          <button
            type="button"
            onClick={() => void submitForMarking()}
            disabled={marking || combinedTranscript.trim().length < 20}
            className="mt-3 w-full rounded-md bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {marking ? "Marking… please wait" : "Get my Speaking report"}
          </button>
          {combinedTranscript.trim().length < 20 && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Record or upload at least one answer first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
