"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ReadingPassage } from "@/lib/types";

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface AttemptRow {
  id: string;
  user_id: string;
  test_id: string;
  module: string;
  band: number | null;
  created_at: string;
  feedback: Record<string, unknown>;
}

interface UploadRow {
  id: string;
  user_id: string;
  bucket: string;
  path: string;
  file_name: string;
  file_size: number | null;
  purpose: string | null;
  created_at: string;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Validate a ReadingPassage object; returns a list of problems (empty = valid). */
function validateReadingPassage(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["The JSON must be a single object."];
  }
  const passage = value as Partial<ReadingPassage>;
  if (!passage.id || typeof passage.id !== "string") errors.push('Missing string "id".');
  if (!passage.title || typeof passage.title !== "string") {
    errors.push('Missing string "title".');
  }
  if (!passage.text || typeof passage.text !== "string") {
    errors.push('Missing string "text" (the passage text).');
  }
  if (!Array.isArray(passage.questions) || passage.questions.length === 0) {
    errors.push('"questions" must be a non-empty array.');
    return errors;
  }
  passage.questions.forEach((question, index) => {
    const prefix = `Question ${index + 1}`;
    if (!question || typeof question !== "object") {
      errors.push(`${prefix}: must be an object.`);
      return;
    }
    if (!question.type || typeof question.type !== "string") {
      errors.push(`${prefix}: missing string "type".`);
    }
    if (!question.prompt || typeof question.prompt !== "string") {
      errors.push(`${prefix}: missing string "prompt".`);
    }
    if (!question.answer || typeof question.answer !== "string") {
      errors.push(`${prefix}: missing string "answer".`);
    }
    if (!question.evidence || typeof question.evidence !== "string") {
      errors.push(`${prefix}: missing string "evidence".`);
    }
  });
  return errors;
}

function purposeLabel(purpose: string | null): string {
  if (!purpose) return "—";
  try {
    const parsed = JSON.parse(purpose) as Record<string, unknown>;
    if (typeof parsed.title === "string") return parsed.title;
    if (typeof parsed.topic === "string") return `Speaking: ${parsed.topic}`;
    if (typeof parsed.kind === "string") return parsed.kind;
  } catch {
    // Not JSON — show it as-is.
  }
  return purpose;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [commentStatus, setCommentStatus] = useState<Record<string, string>>({});

  // Tool state — Reading
  const [readingTrack, setReadingTrack] = useState<"academic" | "general">("academic");
  const [readingJson, setReadingJson] = useState("");
  const [readingStatus, setReadingStatus] = useState<string | null>(null);
  // Tool state — Listening
  const [audioTitle, setAudioTitle] = useState("");
  const [audioTranscript, setAudioTranscript] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioStatus, setAudioStatus] = useState<string | null>(null);
  // Tool state — Writing
  const [writingTrack, setWritingTrack] = useState<"academic" | "general">("academic");
  const [writingType, setWritingType] = useState("chart");
  const [writingPrompt, setWritingPrompt] = useState("");
  const [writingChartDescription, setWritingChartDescription] = useState("");
  const [writingImage, setWritingImage] = useState<File | null>(null);
  const [writingStatus, setWritingStatus] = useState<string | null>(null);
  const [writingSnippet, setWritingSnippet] = useState<string | null>(null);
  // Tool state — Speaking
  const [speakingTopic, setSpeakingTopic] = useState("");
  const [speakingPrompts, setSpeakingPrompts] = useState("");
  const [speakingPart1, setSpeakingPart1] = useState("");
  const [speakingPart3, setSpeakingPart3] = useState("");
  const [speakingStatus, setSpeakingStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }
        const profile = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        if (cancelled) return;
        setUserId(session.user.id);
        setRole((profile.data as { role?: string } | null)?.role ?? "student");
        const userRole = (profile.data as { role?: string } | null)?.role;
        if (userRole === "teacher" || userRole === "admin") {
          const [attemptRows, uploadRows, profileRows] = await Promise.all([
            supabase
              .from("test_attempts")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(50),
            supabase
              .from("uploads")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(50),
            supabase.from("profiles").select("id, email"),
          ]);
          if (cancelled) return;
          if (!attemptRows.error && attemptRows.data) {
            setAttempts(attemptRows.data as unknown as AttemptRow[]);
          }
          if (!uploadRows.error && uploadRows.data) {
            setUploads(uploadRows.data as unknown as UploadRow[]);
          }
          if (!profileRows.error && profileRows.data) {
            const map: Record<string, string> = {};
            for (const row of profileRows.data as { id: string; email: string }[]) {
              map[row.id] = row.email;
            }
            setEmails(map);
          }
        }
      } catch {
        // Keep the page usable; the setup note below explains the fix.
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUploads = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("uploads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setUploads(data as unknown as UploadRow[]);
    } catch {
      // List refresh is best-effort.
    }
  };

  const submitReading = async () => {
    setReadingStatus(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(readingJson);
    } catch {
      setReadingStatus("Error: the JSON could not be parsed. Check for missing commas or quotes.");
      return;
    }
    const errors = validateReadingPassage(parsed);
    if (errors.length > 0) {
      setReadingStatus(`Error: ${errors.join(" ")}`);
      return;
    }
    const passage = parsed as ReadingPassage;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("tests").upsert({
        id: passage.id,
        title: passage.title,
        track: readingTrack,
        data: passage,
      });
      if (error) throw error;
      setReadingStatus(
        `Saved: passage "${passage.title}" stored as test row "${passage.id}" (${readingTrack}).`
      );
    } catch (err) {
      setReadingStatus(
        `Error: could not save the passage. ${err instanceof Error ? err.message : "Unknown error."}`
      );
    }
  };

  const submitAudio = async () => {
    setAudioStatus(null);
    if (!userId) {
      setAudioStatus("Error: you must be signed in.");
      return;
    }
    if (!audioFile) {
      setAudioStatus("Error: choose an mp3 file first.");
      return;
    }
    if (audioFile.size > MAX_AUDIO_BYTES) {
      setAudioStatus("Error: the file is over the 50 MB limit.");
      return;
    }
    if (!audioTitle.trim() || !audioTranscript.trim()) {
      setAudioStatus("Error: add a section title and the transcript.");
      return;
    }
    try {
      const supabase = createClient();
      const path = `${userId}/${Date.now()}-${audioFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(path, audioFile, { contentType: audioFile.type || "audio/mpeg" });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("uploads").insert({
        user_id: userId,
        bucket: "audio",
        path,
        file_name: audioFile.name,
        file_size: audioFile.size,
        mime_type: audioFile.type || "audio/mpeg",
        purpose: JSON.stringify({
          kind: "listening",
          title: audioTitle.trim(),
          transcript: audioTranscript.trim(),
        }),
      });
      if (insertError) throw insertError;
      setAudioStatus(`Saved: "${audioFile.name}" uploaded to the audio bucket.`);
      setAudioTitle("");
      setAudioTranscript("");
      setAudioFile(null);
      void refreshUploads();
    } catch (err) {
      setAudioStatus(
        `Error: upload failed. ${err instanceof Error ? err.message : "Unknown error."}`
      );
    }
  };

  const submitWriting = async () => {
    setWritingStatus(null);
    setWritingSnippet(null);
    if (!userId) {
      setWritingStatus("Error: you must be signed in.");
      return;
    }
    if (!writingPrompt.trim()) {
      setWritingStatus("Error: write the task prompt first.");
      return;
    }
    if (writingImage && writingImage.size > MAX_IMAGE_BYTES) {
      setWritingStatus("Error: the chart image is over the 10 MB limit.");
      return;
    }
    try {
      const supabase = createClient();
      let imageUrl: string | null = null;
      let path = `writing-prompts/${Date.now()}.json`;
      let fileName = "writing-prompt.json";
      if (writingImage) {
        path = `${userId}/${Date.now()}-${writingImage.name}`;
        fileName = writingImage.name;
        const { error: uploadError } = await supabase.storage
          .from("charts")
          .upload(path, writingImage, { contentType: writingImage.type });
        if (uploadError) throw uploadError;
        imageUrl = path;
      }
      const taskJson = {
        type: writingType,
        prompt: writingPrompt.trim(),
        chartDescription: writingChartDescription.trim() || undefined,
        imageUrl,
        minWords: 150,
      };
      const { error: insertError } = await supabase.from("uploads").insert({
        user_id: userId,
        bucket: writingImage ? "charts" : "uploads",
        path,
        file_name: fileName,
        file_size: writingImage ? writingImage.size : null,
        mime_type: writingImage ? writingImage.type : "application/json",
        purpose: JSON.stringify({
          kind: "writing-prompt",
          track: writingTrack,
          ...taskJson,
        }),
      });
      if (insertError) throw insertError;
      setWritingSnippet(JSON.stringify(taskJson, null, 2));
      setWritingStatus("Saved: writing prompt stored. Add the JSON snippet below to a test file.");
      void refreshUploads();
    } catch (err) {
      setWritingStatus(
        `Error: could not save the prompt. ${err instanceof Error ? err.message : "Unknown error."}`
      );
    }
  };

  const submitSpeaking = async () => {
    setSpeakingStatus(null);
    if (!userId) {
      setSpeakingStatus("Error: you must be signed in.");
      return;
    }
    if (!speakingTopic.trim()) {
      setSpeakingStatus("Error: write the Part 2 topic first.");
      return;
    }
    const cueCard = {
      part1: linesToList(speakingPart1),
      part2: { topic: speakingTopic.trim(), prompts: linesToList(speakingPrompts) },
      part3: linesToList(speakingPart3),
    };
    if (cueCard.part2.prompts.length === 0) {
      setSpeakingStatus("Error: add at least one Part 2 prompt (one per line).");
      return;
    }
    try {
      const supabase = createClient();
      const path = `speaking/${Date.now()}.json`;
      const { error } = await supabase.from("uploads").insert({
        user_id: userId,
        bucket: "uploads",
        path,
        file_name: path.split("/").pop() ?? "cue-card.json",
        file_size: null,
        mime_type: "application/json",
        purpose: JSON.stringify({ kind: "speaking-cue-card", ...cueCard }),
      });
      if (error) throw error;
      setSpeakingStatus("Saved: speaking cue card stored.");
      setSpeakingTopic("");
      setSpeakingPrompts("");
      setSpeakingPart1("");
      setSpeakingPart3("");
      void refreshUploads();
    } catch (err) {
      setSpeakingStatus(
        `Error: could not save the cue card. ${err instanceof Error ? err.message : "Unknown error."}`
      );
    }
  };

  const saveComment = async (attempt: AttemptRow) => {
    const comment = (comments[attempt.id] ?? "").trim();
    if (!comment) {
      setCommentStatus((prev) => ({ ...prev, [attempt.id]: "Write a comment first." }));
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("test_attempts")
        .update({ feedback: { ...attempt.feedback, teacher_comment: comment } })
        .eq("id", attempt.id);
      if (error) throw error;
      setAttempts((prev) =>
        prev.map((row) =>
          row.id === attempt.id
            ? { ...row, feedback: { ...row.feedback, teacher_comment: comment } }
            : row
        )
      );
      setCommentStatus((prev) => ({ ...prev, [attempt.id]: "Comment saved." }));
    } catch (err) {
      setCommentStatus((prev) => ({
        ...prev,
        [attempt.id]: `Error: ${err instanceof Error ? err.message : "could not save the comment."}`,
      }));
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Loading the admin panel…</p>
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/40">
          <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
            Supabase is not configured yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
            The admin tools write to Supabase, so they need a project first:
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
            <li>Create a free project at supabase.com.</li>
            <li>Run <code>supabase/schema.sql</code> in the Supabase SQL editor.</li>
            <li>
              Create the Storage buckets <code>audio</code>, <code>uploads</code> and{" "}
              <code>charts</code>.
            </li>
            <li>
              Copy <code>.env.example</code> to <code>.env.local</code> and fill in{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </li>
            <li>Restart the dev server and sign in with a teacher or admin account.</li>
          </ol>
          <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
            Full steps are in the README. Until then, the practice tests still
            work — attempts are saved on this device.
          </p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Sign in to use the admin panel.{" "}
          <Link href="/auth/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Go to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (role !== "teacher" && role !== "admin") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          This panel is for teachers and admins. Your account is a student
          account, so you can practise tests and see your own dashboard, but
          you cannot add content or review other students here. If you should
          be a teacher, ask an admin to change your role in the{" "}
          <code>profiles</code> table.
        </p>
        <Link
          href="/practice"
          className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
        >
          Go to Practice
        </Link>
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800";
  const buttonClass =
    "rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin / Teacher panel</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Signed in as {role}. Content you add here is stored in Supabase.
      </p>

      <div className="mt-8 space-y-8">
        {/* ------------------------- Reading upload ------------------------- */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Reading content upload</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Paste a reading passage as JSON, or upload a JSON file. It must
            have <code>id</code>, <code>title</code>, <code>text</code> and{" "}
            <code>questions</code> — each question needs <code>type</code>,{" "}
            <code>answer</code> and <code>evidence</code>. Valid passages are
            stored as a new test row (or update the row with the same id).
          </p>
          <label htmlFor="reading-track" className="mt-4 block text-sm font-medium">
            Track
          </label>
          <select
            id="reading-track"
            value={readingTrack}
            onChange={(event) =>
              setReadingTrack(event.target.value as "academic" | "general")
            }
            className={inputClass}
          >
            <option value="academic">Academic</option>
            <option value="general">General Training</option>
          </select>
          <label htmlFor="reading-json" className="mt-4 block text-sm font-medium">
            Passage JSON
          </label>
          <textarea
            id="reading-json"
            value={readingJson}
            onChange={(event) => setReadingJson(event.target.value)}
            rows={10}
            placeholder='{"id": "reading-1", "title": "...", "text": "...", "questions": [{"type": "tfng", "prompt": "...", "answer": "True", "evidence": "..."}]}'
            className={`${inputClass} font-mono`}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">
              Or upload a JSON file{" "}
              <input
                type="file"
                accept="application/json,.json"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) setReadingJson(await file.text());
                  event.target.value = "";
                }}
                className="mt-1 block text-sm font-normal"
              />
            </label>
            <button type="button" onClick={() => void submitReading()} className={buttonClass}>
              Save passage
            </button>
          </div>
          {readingStatus && (
            <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {readingStatus}
            </p>
          )}
        </section>

        {/* ------------------------- Listening upload ------------------------ */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Listening audio upload</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Upload an mp3 (max 50 MB) plus its transcript. The file goes to the{" "}
            <code>audio</code> Storage bucket and a record is saved in{" "}
            <code>uploads</code>.
          </p>
          <label htmlFor="audio-title" className="mt-4 block text-sm font-medium">
            Section title
          </label>
          <input
            id="audio-title"
            type="text"
            value={audioTitle}
            onChange={(event) => setAudioTitle(event.target.value)}
            placeholder="e.g. Section 1 — Booking a hotel room"
            className={inputClass}
          />
          <label htmlFor="audio-transcript" className="mt-4 block text-sm font-medium">
            Transcript
          </label>
          <textarea
            id="audio-transcript"
            value={audioTranscript}
            onChange={(event) => setAudioTranscript(event.target.value)}
            rows={6}
            placeholder="Paste the full transcript of the recording…"
            className={inputClass}
          />
          <label htmlFor="audio-file" className="mt-4 block text-sm font-medium">
            MP3 file (max 50 MB)
          </label>
          <input
            id="audio-file"
            type="file"
            accept="audio/mpeg,.mp3"
            onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
            className="mt-1 text-sm"
          />
          {audioFile && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}
          <button type="button" onClick={() => void submitAudio()} className={`mt-4 ${buttonClass}`}>
            Upload audio
          </button>
          {audioStatus && (
            <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {audioStatus}
            </p>
          )}
        </section>

        {/* ------------------------- Writing prompt -------------------------- */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Writing prompt creator</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Create a Writing Task 1 prompt. A chart image (max 10 MB) is
            uploaded to the <code>charts</code> bucket. The prompt is saved to{" "}
            <code>uploads</code> and the JSON snippet below is what to add to
            a test.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="writing-track" className="block text-sm font-medium">Track</label>
              <select
                id="writing-track"
                value={writingTrack}
                onChange={(event) =>
                  setWritingTrack(event.target.value as "academic" | "general")
                }
                className={inputClass}
              >
                <option value="academic">Academic</option>
                <option value="general">General Training</option>
              </select>
            </div>
            <div>
              <label htmlFor="writing-type" className="block text-sm font-medium">Type</label>
              <select
                id="writing-type"
                value={writingType}
                onChange={(event) => setWritingType(event.target.value)}
                className={inputClass}
              >
                <option value="chart">Chart</option>
                <option value="table">Table</option>
                <option value="map">Map</option>
                <option value="process">Process</option>
                <option value="letter">Letter</option>
              </select>
            </div>
          </div>
          <label htmlFor="writing-prompt" className="mt-4 block text-sm font-medium">
            Prompt
          </label>
          <textarea
            id="writing-prompt"
            value={writingPrompt}
            onChange={(event) => setWritingPrompt(event.target.value)}
            rows={4}
            placeholder="e.g. The chart below shows… Summarise the information by selecting and reporting the main features."
            className={inputClass}
          />
          <label htmlFor="writing-chart-description" className="mt-4 block text-sm font-medium">
            Chart description (the data, in words)
          </label>
          <textarea
            id="writing-chart-description"
            value={writingChartDescription}
            onChange={(event) => setWritingChartDescription(event.target.value)}
            rows={3}
            placeholder="e.g. In 2010, 40% of visitors came from…"
            className={inputClass}
          />
          <label htmlFor="writing-image" className="mt-4 block text-sm font-medium">
            Chart image (optional, max 10 MB)
          </label>
          <input
            id="writing-image"
            type="file"
            accept="image/*"
            onChange={(event) => setWritingImage(event.target.files?.[0] ?? null)}
            className="mt-1 text-sm"
          />
          <button type="button" onClick={() => void submitWriting()} className={`mt-4 ${buttonClass}`}>
            Save writing prompt
          </button>
          {writingStatus && (
            <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {writingStatus}
            </p>
          )}
          {writingSnippet && (
            <div className="mt-4">
              <p className="text-sm font-medium">JSON snippet to add to a test:</p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-slate-100 p-3 text-xs dark:bg-slate-800">
                {writingSnippet}
              </pre>
            </div>
          )}
        </section>

        {/* ------------------------- Speaking cue card ------------------------ */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Speaking cue card creator</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Create a Speaking test: a Part 2 topic with prompts, plus Part 1
            and Part 3 question lists (one question per line). Saved to{" "}
            <code>uploads</code> as JSON.
          </p>
          <label htmlFor="speaking-topic" className="mt-4 block text-sm font-medium">
            Part 2 topic
          </label>
          <input
            id="speaking-topic"
            type="text"
            value={speakingTopic}
            onChange={(event) => setSpeakingTopic(event.target.value)}
            placeholder="e.g. Describe a place you like to visit"
            className={inputClass}
          />
          <label htmlFor="speaking-prompts" className="mt-4 block text-sm font-medium">
            Part 2 prompts (one per line)
          </label>
          <textarea
            id="speaking-prompts"
            value={speakingPrompts}
            onChange={(event) => setSpeakingPrompts(event.target.value)}
            rows={4}
            placeholder={"Where it is\nWhen you go there\nWhat you do there\nAnd explain why you like it"}
            className={inputClass}
          />
          <label htmlFor="speaking-part1" className="mt-4 block text-sm font-medium">
            Part 1 questions (one per line)
          </label>
          <textarea
            id="speaking-part1"
            value={speakingPart1}
            onChange={(event) => setSpeakingPart1(event.target.value)}
            rows={4}
            placeholder={"What is your hometown?\nDo you like reading?"}
            className={inputClass}
          />
          <label htmlFor="speaking-part3" className="mt-4 block text-sm font-medium">
            Part 3 questions (one per line)
          </label>
          <textarea
            id="speaking-part3"
            value={speakingPart3}
            onChange={(event) => setSpeakingPart3(event.target.value)}
            rows={4}
            placeholder={"Why do people like to travel?\nHow has tourism changed?"}
            className={inputClass}
          />
          <button type="button" onClick={() => void submitSpeaking()} className={`mt-4 ${buttonClass}`}>
            Save cue card
          </button>
          {speakingStatus && (
            <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {speakingStatus}
            </p>
          )}
        </section>

        {/* ------------------------- Teacher results -------------------------- */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Teacher results view</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Recent student attempts, newest first. Write a comment per attempt
            — it is saved into the attempt&apos;s feedback as{" "}
            <code>teacher_comment</code> and shown to the student on their
            result page.
          </p>
          {attempts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              No student attempts yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {attempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                >
                  <p className="text-sm">
                    <strong>{emails[attempt.user_id] ?? attempt.user_id.slice(0, 8)}</strong>
                    {" · "}
                    {attempt.test_id} · {attempt.module} · Band{" "}
                    <span className="font-mono font-bold">
                      {attempt.band === null ? "—" : attempt.band.toFixed(1)}
                    </span>
                    {" · "}
                    {formatDate(attempt.created_at)}
                  </p>
                  {typeof attempt.feedback.teacher_comment === "string" && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Saved comment: {attempt.feedback.teacher_comment}
                    </p>
                  )}
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={comments[attempt.id] ?? ""}
                      onChange={(event) =>
                        setComments((prev) => ({ ...prev, [attempt.id]: event.target.value }))
                      }
                      placeholder="Write feedback for this student…"
                      aria-label={`Comment for ${attempt.test_id} ${attempt.module}`}
                      className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => void saveComment(attempt)}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:hover:bg-slate-800"
                    >
                      Save comment
                    </button>
                  </div>
                  {commentStatus[attempt.id] && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {commentStatus[attempt.id]}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------- Student uploads -------------------------- */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Student uploads</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Files and content records from the <code>uploads</code> table,
            newest first.
          </p>
          {uploads.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">No uploads yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-96 text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Student</th>
                    <th className="py-2 pr-3 font-medium">Bucket</th>
                    <th className="py-2 pr-3 font-medium">File</th>
                    <th className="py-2 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((upload) => (
                    <tr
                      key={upload.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="py-2 pr-3">{formatDate(upload.created_at)}</td>
                      <td className="py-2 pr-3">{emails[upload.user_id] ?? upload.user_id.slice(0, 8)}</td>
                      <td className="py-2 pr-3">{upload.bucket}</td>
                      <td className="py-2 pr-3 break-all">{upload.file_name}</td>
                      <td className="py-2">{purposeLabel(upload.purpose)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
