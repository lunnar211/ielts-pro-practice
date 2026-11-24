import { NextRequest, NextResponse } from "next/server";
import {
  callExaminerJSON,
  checkRateLimit,
  clampHalfBand,
  countWords,
} from "@/lib/ai";
import {
  WRITING_TASK1_SYSTEM_PROMPT,
  WRITING_TASK2_SYSTEM_PROMPT,
  buildWritingUserPrompt,
  type WritingMarkingResult,
} from "@/lib/prompts";
import { getTest } from "@/lib/seed";
import { roundToNearestHalf } from "@/lib/bands";

export const runtime = "nodejs";

const DISCLAIMER = "AI estimate for practice only, not an official IELTS result";
const RATE_LIMIT_MESSAGE =
  "Too many marking requests — please wait a minute and try again.";

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function sanitiseResult(
  data: unknown,
  wordCount: number,
  underLength: boolean
): WritingMarkingResult | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  if (!Array.isArray(raw.criteria) || raw.criteria.length === 0) return null;
  const criteria = raw.criteria.map((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    return {
      name: typeof item.name === "string" ? item.name : "Criterion",
      band: clampHalfBand(item.band),
      justification:
        typeof item.justification === "string" ? item.justification : "",
    };
  });
  const overallBand = roundToNearestHalf(
    criteria.reduce((sum, c) => sum + c.band, 0) / criteria.length
  );
  const stringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  const correctedSentences = Array.isArray(raw.correctedSentences)
    ? raw.correctedSentences
        .map((entry) => {
          const item = (entry ?? {}) as Record<string, unknown>;
          return {
            original: typeof item.original === "string" ? item.original : "",
            corrected:
              typeof item.corrected === "string" ? item.corrected : "",
            explanation:
              typeof item.explanation === "string" ? item.explanation : "",
          };
        })
        .filter((entry) => entry.original.length > 0)
    : [];
  const vocabularyUpgrades = Array.isArray(raw.vocabularyUpgrades)
    ? raw.vocabularyUpgrades
        .map((entry) => {
          const item = (entry ?? {}) as Record<string, unknown>;
          return {
            original: typeof item.original === "string" ? item.original : "",
            upgrade: typeof item.upgrade === "string" ? item.upgrade : "",
            example: typeof item.example === "string" ? item.example : "",
          };
        })
        .filter((entry) => entry.original.length > 0)
    : [];
  const paragraphAnalysis = Array.isArray(raw.paragraphAnalysis)
    ? raw.paragraphAnalysis.map((entry) => {
        const item = (entry ?? {}) as Record<string, unknown>;
        return {
          paragraph:
            typeof item.paragraph === "number" ? item.paragraph : 0,
          comment: typeof item.comment === "string" ? item.comment : "",
        };
      })
    : [];
  return {
    criteria,
    overallBand,
    strengths: stringArray(raw.strengths),
    weaknesses: stringArray(raw.weaknesses),
    correctedSentences,
    improvementPlan: stringArray(raw.improvementPlan).slice(0, 3),
    modelAnswer:
      typeof raw.modelAnswer === "string" ? raw.modelAnswer : undefined,
    vocabularyUpgrades,
    paragraphAnalysis,
    offTopic: raw.offTopic === true,
    offTopicNote:
      typeof raw.offTopicNote === "string" ? raw.offTopicNote : "",
    memorisedTemplate: raw.memorisedTemplate === true,
    memorisedTemplateNote:
      typeof raw.memorisedTemplateNote === "string"
        ? raw.memorisedTemplateNote
        : "",
    wordCount,
    underLength,
  };
}

export async function POST(request: NextRequest) {
  if (!checkRateLimit(`mark-writing:${clientIp(request)}`)) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: RATE_LIMIT_MESSAGE },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }
  const payload = (body ?? {}) as Record<string, unknown>;
  const testId = typeof payload.testId === "string" ? payload.testId : "";
  const task = payload.task === "task1" || payload.task === "task2"
    ? payload.task
    : null;
  const text = typeof payload.text === "string" ? payload.text : "";

  if (!task) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "task must be 'task1' or 'task2'." },
      { status: 400 }
    );
  }
  if (text.trim().length < 20) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Please write at least 20 characters before submitting for marking.",
      },
      { status: 400 }
    );
  }

  const test = testId ? getTest(testId) : undefined;
  const minWords = task === "task1" ? test?.writing.task1.minWords ?? 150 : test?.writing.task2.minWords ?? 250;
  const taskPrompt =
    task === "task1"
      ? test?.writing.task1.prompt ?? "IELTS Writing Task 1"
      : test?.writing.task2.prompt ?? "IELTS Writing Task 2";
  const chartDescription =
    task === "task1" ? test?.writing.task1.chartDescription : undefined;

  const wordCount = countWords(text);
  const underLength = wordCount < minWords;

  const result = await callExaminerJSON(
    task === "task1" ? WRITING_TASK1_SYSTEM_PROMPT : WRITING_TASK2_SYSTEM_PROMPT,
    buildWritingUserPrompt({
      task,
      taskPrompt,
      chartDescription,
      text,
      wordCount,
      minWords,
    })
  );

  if (!result.ok) {
    const status =
      result.error === "AI_MARKING_NOT_CONFIGURED"
        ? 503
        : result.error === "AI_QUOTA_EXHAUSTED"
          ? 429
          : 502;
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status }
    );
  }

  const marking = sanitiseResult(result.data, wordCount, underLength);
  if (!marking) {
    return NextResponse.json(
      {
        error: "AI_ERROR",
        message:
          "The AI reply could not be understood — please try again in a few minutes.",
      },
      { status: 502 }
    );
  }

  const penaltyNote = underLength
    ? `Under-length answer: ${wordCount} words, below the ${minWords}-word minimum. In the real test this lowers the Task Achievement / Task Response band.`
    : null;

  return NextResponse.json({
    ...marking,
    wordCount,
    underLength,
    underLengthNote: penaltyNote,
    disclaimer: DISCLAIMER,
  });
}
