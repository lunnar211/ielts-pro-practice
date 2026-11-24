"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  currentStreak,
  formatBand,
  formatDate,
  loadLocalAttempts,
  MODULE_LABELS,
  parseSupabaseAttempt,
  weakQuestionTypes,
  type Attempt,
} from "@/lib/attempts";
import { overallBand } from "@/lib/bands";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const TARGET_KEY = "ielts-target-band";
const MODULES = ["listening", "reading", "writing", "speaking"] as const;

export default function DashboardPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [targetBand, setTargetBand] = useState(7.0);
  const [targetSaved, setTargetSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Local target band is the fallback; a signed-in profile overrides it.
      try {
        const stored = window.localStorage.getItem(TARGET_KEY);
        if (stored) {
          const parsed = Number(stored);
          if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 9) {
            setTargetBand(parsed);
          }
        }
      } catch {
        // localStorage unavailable — keep the default.
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            const [attemptRows, profile] = await Promise.all([
              supabase
                .from("test_attempts")
                .select("*")
                .eq("user_id", session.user.id)
                .order("created_at", { ascending: false }),
              supabase
                .from("profiles")
                .select("target_band")
                .eq("id", session.user.id)
                .maybeSingle(),
            ]);
            if (cancelled) return;
            setSignedIn(true);
            if (!attemptRows.error && attemptRows.data) {
              setAttempts(
                (attemptRows.data as Record<string, unknown>[]).map(
                  parseSupabaseAttempt
                )
              );
            }
            const profileBand = Number(
              (profile.data as { target_band?: unknown } | null)?.target_band
            );
            if (Number.isFinite(profileBand) && profileBand >= 0 && profileBand <= 9) {
              setTargetBand(profileBand);
            }
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to device-only attempts below.
        }
      }

      if (!cancelled) {
        setAttempts(loadLocalAttempts());
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveTargetBand = async (value: number) => {
    setTargetBand(value);
    setTargetSaved(null);
    try {
      window.localStorage.setItem(TARGET_KEY, String(value));
    } catch {
      // Saving locally failed; the Supabase save below may still work.
    }
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { error } = await supabase
            .from("profiles")
            .update({ target_band: value })
            .eq("id", session.user.id);
          setTargetSaved(
            error ? "Could not save to your account — saved on this device." : "Target band saved."
          );
          return;
        }
      } catch {
        // Keep the local copy.
      }
    }
    setTargetSaved("Target band saved on this device.");
  };

  const moduleAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.module !== "mock"),
    [attempts]
  );
  const mockAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.module === "mock"),
    [attempts]
  );

  // Latest overall band: prefer a completed full mock; otherwise combine the
  // newest attempt of each module for the same test, when all four exist.
  const latestOverall = useMemo((): number | null => {
    if (mockAttempts.length > 0 && mockAttempts[0].band !== null) {
      return mockAttempts[0].band;
    }
    const newestByModule = new Map<string, Attempt>();
    const newestByTest = new Map<string, Map<string, Attempt>>();
    for (const attempt of moduleAttempts) {
      if (!newestByModule.has(attempt.module)) newestByModule.set(attempt.module, attempt);
      const byTest =
        newestByTest.get(attempt.testId) ?? new Map<string, Attempt>();
      if (!byTest.has(attempt.module)) byTest.set(attempt.module, attempt);
      newestByTest.set(attempt.testId, byTest);
    }
    for (const byTest of newestByTest.values()) {
      const bands = MODULES.map((module) => byTest.get(module)?.band ?? null);
      if (bands.every((band) => band !== null)) {
        return overallBand(
          bands[0] as number,
          bands[1] as number,
          bands[2] as number,
          bands[3] as number
        );
      }
    }
    return null;
  }, [moduleAttempts, mockAttempts]);

  const chartData = useMemo(
    () =>
      [...moduleAttempts]
        .filter((attempt) => attempt.band !== null)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((attempt) => ({
          date: formatDate(attempt.createdAt),
          band: attempt.band as number,
          label: `${MODULE_LABELS[attempt.module]} · ${attempt.testId}`,
        })),
    [moduleAttempts]
  );

  const weakTypes = useMemo(() => weakQuestionTypes(moduleAttempts), [moduleAttempts]);
  const streak = useMemo(() => currentStreak(attempts), [attempts]);
  const bestBand = useMemo(
    () =>
      moduleAttempts.reduce<number | null>(
        (best, attempt) =>
          attempt.band !== null && (best === null || attempt.band > best)
            ? attempt.band
            : best,
        null
      ),
    [moduleAttempts]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Loading your progress…</p>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            No attempts yet — take a practice test
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
            Your band history, weakest question types and streak will appear
            here after your first Listening, Reading, Writing or Speaking test.
          </p>
          <Link
            href="/practice"
            className="mt-5 inline-block rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Go to Practice
          </Link>
        </div>
        <TargetBandCard
          targetBand={targetBand}
          savedMessage={targetSaved}
          onSave={(value) => void saveTargetBand(value)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {signedIn
          ? "Attempts saved to your account."
          : "Attempts saved on this device. Sign in to keep them in your account."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Latest overall band" value={formatBand(latestOverall)} />
        <StatCard label="Best module band" value={formatBand(bestBand)} />
        <StatCard label="Day streak" value={String(streak)} />
        <StatCard label="Attempts" value={String(moduleAttempts.length)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Band progress over time
          </h2>
          {chartData.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              No band scores to chart yet.
            </p>
          ) : (
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 9]} ticks={[0, 3, 5, 6, 7, 8, 9]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`Band ${Number(value).toFixed(1)}`, "Band"]}
                    labelFormatter={(label) => String(label)}
                  />
                  <Line
                    type="monotone"
                    dataKey="band"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            One point per module attempt, oldest to newest. Full mock attempts
            are shown in the history below, not in this chart.
          </p>
        </div>

        <TargetBandCard
          targetBand={targetBand}
          savedMessage={targetSaved}
          onSave={(value) => void saveTargetBand(value)}
        />
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Weak question types
        </h2>
        {weakTypes.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            No incorrect answers recorded yet — or your Listening and Reading
            attempts have no per-question detail. Keep practising and this list
            will show where you lose the most marks.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {weakTypes.slice(0, 5).map((entry) => (
              <li key={entry.type} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {entry.type}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {entry.missed} missed of {entry.total}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Test history</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-96 text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Test</th>
                <th className="py-2 pr-3 font-medium">Module</th>
                <th className="py-2 pr-3 font-medium">Band</th>
                <th className="py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr
                  key={attempt.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="py-2 pr-3">{formatDate(attempt.createdAt)}</td>
                  <td className="py-2 pr-3">{attempt.testId}</td>
                  <td className="py-2 pr-3">{MODULE_LABELS[attempt.module]}</td>
                  <td className="py-2 pr-3 font-mono font-semibold">
                    {formatBand(attempt.band)}
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/dashboard/attempt/${encodeURIComponent(attempt.id)}`}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      View result
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function TargetBandCard({
  targetBand,
  savedMessage,
  onSave,
}: {
  targetBand: number;
  savedMessage: string | null;
  onSave: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        Target band tracker
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Your target band is <strong className="font-mono">{targetBand.toFixed(1)}</strong>.
        Change it any time — it is saved to your profile when you are signed
        in, or on this device when you are not.
      </p>
      <label htmlFor="target-band" className="mt-4 block text-sm font-medium">
        Target band (0–9)
      </label>
      <input
        id="target-band"
        type="number"
        min={0}
        max={9}
        step={0.5}
        value={targetBand}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value) && value >= 0 && value <= 9) onSave(value);
        }}
        className="mt-1 w-32 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800"
      />
      {savedMessage && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{savedMessage}</p>
      )}
    </div>
  );
}
