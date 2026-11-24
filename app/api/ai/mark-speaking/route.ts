import { NextRequest, NextResponse } from "next/server";
import {
  callExaminerJSON,
  checkRateLimit,
  clampHalfBand,
} from "@/lib/ai";
import {
  SPEAKING_SYSTEM_PROMPT,
  buildSpeakingUserPrompt,
  type SpeakingMarkingResult,
} from "@/lib/prompts";
import { roundToNearestHalf } from "@/lib/bands";

export const runtime = "nodejs";

const DISCLAIMER = "AI estimate for practice only, not an official IELTS result";
const PRONUNCIATION_NOTE =
  "Pronunciation is estimated from the transcript (hesitations, fillers, pace) and is the least reliable AI estimate — a human examiner listens to your actual voice.";
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
  wordsPerMinute: number,
  fillerCount: number,
  pauseCount: number
): SpeakingMarkingResult | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  if (!Array.isArray(raw.criteria) || raw.criteria.length === 0) return null;
  const criteria = raw.criteria.map((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name : "Criterion";
    let band = clampHalfBand(item.band);
    // Pronunciation from a transcript alone must stay conservative.
    if (name.toLowerCase().includes("pronunciation")) {
      band = Math.min(band, 6.5);
    }
    return {
      name,
      band,
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
  const betterAnswerExamples = Array.isArray(raw.betterAnswerExamples)
    ? raw.betterAnswerExamples
        .map((entry) => {
          const item = (entry ?? {}) as Record<string, unknown>;
          return {
            original: typeof item.original === "string" ? item.original : "",
            better: typeof item.better === "string" ? item.better : "",
            explanation:
              typeof item.explanation === "string" ? item.explanation : "",
          };
        })
        .filter((entry) => entry.original.length > 0)
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
    fillerWordCount:
      typeof raw.fillerWordCount === "number"
        ? raw.fillerWordCount
        : fillerCount,
    longPauses:
      typeof raw.longPauses === "number" ? raw.longPauses : pauseCount,
    wordsPerMinute,
    followUpQuestions: stringArray(raw.followUpQuestions),
    betterAnswerExamples,
    pronunciationNote: PRONUNCIATION_NOTE,
  };
}

export async function POST(request: NextRequest) {
  if (!checkRateLimit(`mark-speaking:${clientIp(request)}`)) {
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
  const transcript =
    typeof payload.transcript === "string" ? payload.transcript : "";
  const part = typeof payload.part === "string" ? payload.part : "Parts 1–3";
  const wordsPerMinute =
    typeof payload.wordsPerMinute === "number" ? payload.wordsPerMinute : 0;
  const fillerCount =
    typeof payload.fillerCount === "number" ? payload.fillerCount : 0;
  const pauseCount =
    typeof payload.pauseCount === "number" ? payload.pauseCount : 0;

  if (transcript.trim().length < 20) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message:
          "The transcript is too short to mark — please record or upload a longer answer (at least 20 characters).",
      },
      { status: 400 }
    );
  }

  const result = await callExaminerJSON(
    SPEAKING_SYSTEM_PROMPT,
    buildSpeakingUserPrompt({
      transcript,
      part,
      wordsPerMinute,
      fillerCount,
      pauseCount,
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

  const marking = sanitiseResult(
    result.data,
    wordsPerMinute,
    fillerCount,
    pauseCount
  );
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

  return NextResponse.json({
    ...marking,
    pronunciationNote: PRONUNCIATION_NOTE,
    disclaimer: DISCLAIMER,
  });
}
