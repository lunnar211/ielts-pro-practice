// Shared attempt shape used by the dashboard and the attempt detail page.
// Attempts come from two places: Supabase `test_attempts` (logged-in users)
// and localStorage keys starting with `ielts-attempt-` (logged-out users).
// The exam components write both shapes, so this module normalises them.

export type ModuleName = "listening" | "reading" | "writing" | "speaking" | "mock";

export interface PerQuestionEntry {
  id: string;
  type: string;
  correct: boolean;
  /** False when the question was left unanswered (blank answer). */
  attempted: boolean;
}

export interface CriterionEntry {
  name: string;
  band: number;
  justification?: string;
}

export interface Attempt {
  /** Supabase uuid, or the localStorage key for device-only attempts. */
  id: string;
  testId: string;
  module: ModuleName;
  band: number | null;
  rawScore: number | null;
  createdAt: string;
  /** Raw feedback JSONB / local payload, kept for criteria + weak-type work. */
  feedback: Record<string, unknown>;
  /** Per-question results when present (Listening / Reading). */
  perQuestion: PerQuestionEntry[];
  /** Per-criterion scores when present (Writing / Speaking AI marking). */
  criteria: CriterionEntry[];
  /** Full-mock module bands, only for module === "mock". */
  mockBands?: Record<string, number>;
  /** True when this attempt only lives on this device. */
  localOnly: boolean;
}

const LOCAL_PREFIX = "ielts-attempt-";
export const MOCK_PREFIX = "ielts-attempt-mock-";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toPerQuestion(value: unknown): PerQuestionEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      type: typeof entry.type === "string" ? entry.type : "unknown",
      correct: entry.correct === true,
      // The marking libs store the user's answer on every entry. A blank
      // answer means the question was never attempted — it must not count
      // as "missed". Entries without an answer field (older saves) keep
      // the old behaviour and count as attempted.
      attempted:
        typeof entry.userAnswer === "string"
          ? entry.userAnswer.trim().length > 0
          : true,
    }))
    .filter((entry) => entry.id.length > 0);
}

function toCriteria(value: unknown): CriterionEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((entry) => ({
      name: typeof entry.name === "string" ? entry.name : "Criterion",
      band: toNumber(entry.band) ?? 0,
      justification:
        typeof entry.justification === "string" ? entry.justification : undefined,
    }))
    .filter((entry) => entry.band > 0 || entry.name !== "Criterion");
}

/** Extract criteria from a Writing or Speaking feedback payload. */
export function criteriaFromFeedback(feedback: Record<string, unknown>): CriterionEntry[] {
  // Speaking: feedback.report.criteria
  if (isRecord(feedback.report)) {
    const criteria = toCriteria(feedback.report.criteria);
    if (criteria.length > 0) return criteria;
  }
  // Writing: feedback.task1.criteria + feedback.task2.criteria (averaged per name)
  const byName = new Map<string, { total: number; count: number; justification: string }>();
  for (const key of ["task1", "task2"]) {
    if (!isRecord(feedback[key])) continue;
    for (const criterion of toCriteria(feedback[key].criteria)) {
      const existing = byName.get(criterion.name) ?? { total: 0, count: 0, justification: "" };
      existing.total += criterion.band;
      existing.count += 1;
      if (criterion.justification) existing.justification = criterion.justification;
      byName.set(criterion.name, existing);
    }
  }
  return [...byName.entries()].map(([name, value]) => ({
    name,
    band: Math.round((value.total / value.count) * 2) / 2,
    justification: value.justification || undefined,
  }));
}

/** Normalise one localStorage payload (any exam component's shape). */
export function parseLocalAttempt(key: string, raw: string): Attempt | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const moduleName = parsed.module;
  if (
    moduleName !== "listening" &&
    moduleName !== "reading" &&
    moduleName !== "writing" &&
    moduleName !== "speaking" &&
    moduleName !== "mock"
  ) {
    return null;
  }
  const testId =
    typeof parsed.testId === "string"
      ? parsed.testId
      : key.replace(LOCAL_PREFIX, "").replace(`${moduleName}-`, "");
  const feedback = isRecord(parsed.feedback) ? parsed.feedback : {};
  // Reading stores perQuestion at the top level; Listening inside feedback.
  const perQuestion = toPerQuestion(parsed.perQuestion ?? feedback.perQuestion);
  // Writing stores criteria inside task1/task2; Speaking inside report.
  const criteria = criteriaFromFeedback({
    ...feedback,
    task1: parsed.task1,
    task2: parsed.task2,
    report: parsed.report,
  });
  const mockBands = isRecord(parsed.bands)
    ? Object.fromEntries(
        Object.entries(parsed.bands).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number"
        )
      )
    : undefined;
  return {
    id: key,
    testId,
    module: moduleName,
    band: toNumber(parsed.band),
    rawScore: toNumber(parsed.rawScore ?? parsed.raw_score),
    createdAt:
      typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    feedback,
    perQuestion,
    criteria,
    mockBands,
    localOnly: true,
  };
}

/** Normalise one Supabase `test_attempts` row. */
export function parseSupabaseAttempt(row: Record<string, unknown>): Attempt {
  const feedback = isRecord(row.feedback) ? row.feedback : {};
  return {
    id: typeof row.id === "string" ? row.id : String(row.id ?? ""),
    testId: typeof row.test_id === "string" ? row.test_id : "",
    module: (typeof row.module === "string" ? row.module : "reading") as ModuleName,
    band: toNumber(row.band),
    rawScore: toNumber(row.raw_score),
    createdAt:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    feedback,
    perQuestion: toPerQuestion(feedback.perQuestion),
    criteria: criteriaFromFeedback(feedback),
    localOnly: false,
  };
}

/** All device-only attempts stored in localStorage, newest first. */
export function loadLocalAttempts(): Attempt[] {
  if (typeof window === "undefined") return [];
  const attempts: Attempt[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(LOCAL_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    const attempt = parseLocalAttempt(key, raw);
    if (attempt) attempts.push(attempt);
  }
  return attempts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Incorrect-answer counts grouped by question type, most-missed first.
 * Only questions the user actually attempted count towards `missed` and
 * `attempted`; questions left blank are reported separately as
 * `unanswered` instead of being counted as missed.
 */
export function weakQuestionTypes(
  attempts: Attempt[]
): { type: string; missed: number; attempted: number; unanswered: number }[] {
  const counts = new Map<
    string,
    { missed: number; attempted: number; unanswered: number }
  >();
  for (const attempt of attempts) {
    for (const question of attempt.perQuestion) {
      const entry = counts.get(question.type) ?? {
        missed: 0,
        attempted: 0,
        unanswered: 0,
      };
      if (!question.attempted) {
        entry.unanswered += 1;
      } else {
        entry.attempted += 1;
        if (!question.correct) entry.missed += 1;
      }
      counts.set(question.type, entry);
    }
  }
  return [...counts.entries()]
    .map(([type, value]) => ({ type, ...value }))
    .filter((entry) => entry.missed > 0)
    .sort((a, b) => b.missed - a.missed || b.attempted - a.attempted);
}

/** Consecutive days (ending today, or yesterday if nothing today) with >= 1 attempt. */
export function currentStreak(attempts: Attempt[]): number {
  const days = new Set(
    attempts.map((attempt) => attempt.createdAt.slice(0, 10))
  );
  if (days.size === 0) return 0;
  const cursor = new Date();
  // If there is no attempt today, the streak may still be alive from yesterday.
  const today = cursor.toISOString().slice(0, 10);
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export const MODULE_LABELS: Record<ModuleName, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
  mock: "Full mock",
};

export function formatBand(band: number | null): string {
  return band === null ? "—" : band.toFixed(1);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
