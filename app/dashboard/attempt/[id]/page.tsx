"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  formatBand,
  formatDate,
  loadLocalAttempts,
  MODULE_LABELS,
  parseSupabaseAttempt,
  type Attempt,
} from "@/lib/attempts";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const DISCLAIMER = "AI estimate for practice only, not an official IELTS result";

export default function AttemptDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const attemptId = decodeURIComponent(params.id);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("test_attempts")
            .select("*")
            .eq("id", attemptId)
            .maybeSingle();
          if (!cancelled && !error && data) {
            setAttempt(parseSupabaseAttempt(data as Record<string, unknown>));
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to the device-only lookup below.
        }
      }
      if (!cancelled) {
        const local = loadLocalAttempts().find((entry) => entry.id === attemptId);
        setAttempt(local ?? null);
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const radarData = useMemo(() => {
    if (!attempt) return null;
    if (attempt.criteria.length > 0) {
      return attempt.criteria.map((criterion) => ({
        label: criterion.name,
        band: criterion.band,
      }));
    }
    if (attempt.module === "mock" && attempt.mockBands) {
      return (["listening", "reading", "writing", "speaking"] as const).map(
        (module) => ({
          label: MODULE_LABELS[module],
          band: attempt.mockBands?.[module] ?? 0,
        })
      );
    }
    if (attempt.perQuestion.length > 0) {
      const byType = new Map<string, { correct: number; total: number }>();
      for (const question of attempt.perQuestion) {
        const entry = byType.get(question.type) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (question.correct) entry.correct += 1;
        byType.set(question.type, entry);
      }
      return [...byType.entries()].map(([type, value]) => ({
        label: type,
        // Radar axis is a band scale (0–9), so show accuracy scaled to 9.
        band: Math.round((value.correct / value.total) * 9 * 10) / 10,
      }));
    }
    return null;
  }, [attempt]);

  const radarCaption = useMemo(() => {
    if (!attempt || !radarData) return "";
    if (attempt.criteria.length > 0) return "Per-criterion bands (0–9).";
    if (attempt.module === "mock") return "Module bands (0–9).";
    return "Accuracy by question type, scaled to 0–9.";
  }, [attempt, radarData]);

  const downloadPdf = async () => {
    if (!attempt) return;
    setPdfStatus("Building your PDF report…");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(18);
      doc.text("IELTS Pro Practice — Result Report", 14, y);
      y += 10;
      doc.setFontSize(11);
      doc.text(`Date: ${formatDate(attempt.createdAt)}`, 14, y);
      y += 7;
      doc.text(`Test: ${attempt.testId}`, 14, y);
      y += 7;
      doc.text(`Module: ${MODULE_LABELS[attempt.module]}`, 14, y);
      y += 7;
      doc.text(`Band: ${formatBand(attempt.band)}`, 14, y);
      y += 12;
      if (attempt.module === "mock" && attempt.mockBands) {
        doc.setFontSize(13);
        doc.text("Module bands", 14, y);
        y += 8;
        doc.setFontSize(11);
        for (const mod of ["listening", "reading", "writing", "speaking"] as const) {
          doc.text(
            `${MODULE_LABELS[mod]}: ${formatBand(attempt.mockBands[mod] ?? null)}`,
            14,
            y
          );
          y += 7;
        }
        y += 5;
      }
      if (attempt.criteria.length > 0) {
        doc.setFontSize(13);
        doc.text("Criteria", 14, y);
        y += 8;
        doc.setFontSize(11);
        for (const criterion of attempt.criteria) {
          const lines = doc.splitTextToSize(
            `${criterion.name}: ${criterion.band.toFixed(1)}${criterion.justification ? ` — ${criterion.justification}` : ""}`,
            180
          );
          for (const line of lines) {
            if (y > 270) {
              doc.addPage();
              y = 20;
            }
            doc.text(line, 14, y);
            y += 7;
          }
        }
        y += 5;
      }
      if (attempt.rawScore !== null) {
        doc.text(`Raw score: ${attempt.rawScore}`, 14, y);
        y += 7;
      }
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(10);
      doc.text(DISCLAIMER, 14, y);
      doc.save(`ielts-result-${attempt.testId}-${attempt.module}.pdf`);
      setPdfStatus("PDF downloaded.");
    } catch {
      setPdfStatus("Could not build the PDF. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Result</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Loading your result…</p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Attempt not found
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          We could not find this attempt. It may have been saved on a different
          device, or in a different account. Device-only attempts only exist on
          the device where the test was taken.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const teacherComment =
    typeof attempt.feedback.teacher_comment === "string"
      ? attempt.feedback.teacher_comment
      : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-brand-400"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
        Result — {MODULE_LABELS[attempt.module]} · {attempt.testId}
      </h1>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        {formatDate(attempt.createdAt)}
        {attempt.localOnly ? " · saved on this device" : " · saved to your account"}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Band</p>
          <p className="mt-1 font-mono text-3xl font-bold">{formatBand(attempt.band)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Raw score</p>
          <p className="mt-1 font-mono text-3xl font-bold">
            {attempt.rawScore === null ? "—" : attempt.rawScore}
          </p>
        </div>
        <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-5 text-center sm:col-span-1 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Module</p>
          <p className="mt-1 text-xl font-bold">{MODULE_LABELS[attempt.module]}</p>
        </div>
      </div>

      {attempt.module === "mock" && attempt.mockBands && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Module bands</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["listening", "reading", "writing", "speaking"] as const).map((module) => (
              <li key={module} className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  {MODULE_LABELS[module]}:{" "}
                </span>
                <span className="font-mono font-bold">
                  {formatBand(attempt.mockBands?.[module] ?? null)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {attempt.criteria.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Per-criterion breakdown</h2>
          <div className="mt-3 space-y-3">
            {attempt.criteria.map((criterion) => (
              <div key={criterion.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold">{criterion.name}</h3>
                  <span className="font-mono text-xl font-bold">
                    {criterion.band.toFixed(1)}
                  </span>
                </div>
                {criterion.justification && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {criterion.justification}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {teacherComment && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Teacher comment</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {teacherComment}
          </p>
        </div>
      )}

      {radarData && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Score radar</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{radarCaption}</p>
          <div className="mt-2 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 9]} tick={{ fontSize: 11 }} />
                <Radar
                  name="Band"
                  dataKey="band"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.4}
                />
                <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}`, "Band"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void downloadPdf()}
          className="rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Download PDF report
        </button>
        {pdfStatus && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{pdfStatus}</p>
        )}
      </div>

      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{DISCLAIMER}</p>
    </div>
  );
}
