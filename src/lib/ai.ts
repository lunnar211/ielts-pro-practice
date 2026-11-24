// Shared server-side AI helper for IELTS Pro Practice.
//
// All AI calls go through Next.js server routes only — never from client
// code — and never throw when keys are absent. Groq (free tier) is tried
// first; Google Gemini (free tier) is the fallback.
//
// No real API keys live here. Keys come from environment variables only:
//   GROQ_API_KEY, GEMINI_API_KEY (set in Vercel env vars).

import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = "groq" | "gemini";

export type AIErrorCode =
  | "AI_MARKING_NOT_CONFIGURED"
  | "AI_QUOTA_EXHAUSTED"
  | "AI_ERROR";

export type ExaminerResult =
  | { ok: true; data: unknown; provider: AIProvider }
  | { ok: false; error: AIErrorCode; message: string };

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI marking needs a free Groq/Gemini key — add it in Vercel env vars.";
export const AI_QUOTA_MESSAGE =
  "The free AI quota is used up right now — please try again in a few minutes.";
export const AI_ERROR_MESSAGE =
  "AI marking is unavailable right now — please try again in a few minutes.";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GEMINI_MODEL = "gemini-1.5-flash";

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const status = record.status ?? record.statusCode;
  if (status === 429 || status === "429") return true;
  const message =
    typeof record.message === "string" ? record.message.toLowerCase() : "";
  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("rate_limit") ||
    message.includes("quota") ||
    message.includes("too many requests")
  );
}

/** Extract a JSON object from a model reply, tolerating ```json fences. */
export function parseModelJSON(text: string): unknown {
  const trimmed = text.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  try {
    return JSON.parse(withoutFences);
  } catch {
    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(withoutFences.slice(start, end + 1));
    }
    throw new Error("Model reply did not contain valid JSON.");
  }
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string
): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });
  const content = completion.choices[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("Groq returned an empty reply.");
  return parseModelJSON(content);
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(
    `${systemPrompt}\n\n---\n\n${userPrompt}`
  );
  const text = result.response.text();
  if (!text.trim()) throw new Error("Gemini returned an empty reply.");
  return parseModelJSON(text);
}

/**
 * Ask the examiner model for a JSON marking result. Tries Groq first, then
 * Gemini. Never throws: failures are returned as a typed error object.
 */
export async function callExaminerJSON(
  systemPrompt: string,
  userPrompt: string
): Promise<ExaminerResult> {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  if (!hasGroq && !hasGemini) {
    return {
      ok: false,
      error: "AI_MARKING_NOT_CONFIGURED",
      message: AI_NOT_CONFIGURED_MESSAGE,
    };
  }

  if (hasGroq) {
    try {
      const data = await callGroq(systemPrompt, userPrompt);
      return { ok: true, data, provider: "groq" };
    } catch (error) {
      if (isRateLimitError(error) && !hasGemini) {
        return {
          ok: false,
          error: "AI_QUOTA_EXHAUSTED",
          message: AI_QUOTA_MESSAGE,
        };
      }
      // Any other Groq failure falls through to Gemini when available.
      if (!hasGemini) {
        return {
          ok: false,
          error: "AI_ERROR",
          message: AI_ERROR_MESSAGE,
        };
      }
    }
  }

  try {
    const data = await callGemini(systemPrompt, userPrompt);
    return { ok: true, data, provider: "gemini" };
  } catch (error) {
    if (isRateLimitError(error)) {
      return {
        ok: false,
        error: "AI_QUOTA_EXHAUSTED",
        message: AI_QUOTA_MESSAGE,
      };
    }
    return { ok: false, error: "AI_ERROR", message: AI_ERROR_MESSAGE };
  }
}

/* ------------------------- Simple per-IP rate limit ------------------------ */

const rateLimitBuckets = new Map<string, number[]>();

/**
 * Allow at most `maxRequests` calls per `windowMs` for a given key.
 * In-memory only — suitable for the free tier / single-instance deploys.
 */
export function checkRateLimit(
  key: string,
  maxRequests = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const hits = (rateLimitBuckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs
  );
  if (hits.length >= maxRequests) {
    rateLimitBuckets.set(key, hits);
    return false;
  }
  hits.push(now);
  rateLimitBuckets.set(key, hits);
  return true;
}

/** Clamp a band score to 0–9 in half-band steps. */
export function clampHalfBand(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(9, Math.max(0, Math.round(n * 2) / 2));
}

/** Count words in a piece of text (whitespace-separated tokens). */
export function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return text.trim().length === 0 ? 0 : words.length;
}
