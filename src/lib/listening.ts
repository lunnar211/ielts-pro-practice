import { listeningBand } from "./bands";
import type { IELTSTest } from "./types";

export interface ListeningPerQuestion {
  id: string;
  type: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
}

export interface ListeningResult {
  raw: number;
  band: number;
  perQuestion: ListeningPerQuestion[];
}

/**
 * Normalise an answer for comparison: trim, lowercase, collapse internal
 * whitespace, and strip a single trailing full stop. Spelling-sensitive:
 * after normalisation the answer must match exactly.
 */
export function normaliseAnswer(value: string): string {
  let out = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (out.endsWith(".")) {
    out = out.slice(0, -1).trim();
  }
  return out;
}

export function markListening(
  test: IELTSTest,
  answers: Record<string, string>
): ListeningResult {
  const perQuestion: ListeningPerQuestion[] = [];
  let raw = 0;

  for (const section of test.listening.sections) {
    for (const question of section.questions) {
      const userAnswer = answers[question.id] ?? "";
      const normalisedUser = normaliseAnswer(userAnswer);
      const candidates = [question.answer, ...(question.alternatives ?? [])];
      const correct =
        normalisedUser.length > 0 &&
        candidates.some((c) => normaliseAnswer(c) === normalisedUser);
      if (correct) raw += 1;
      perQuestion.push({
        id: question.id,
        type: question.type,
        correct,
        userAnswer,
        correctAnswer: question.answer,
      });
    }
  }

  return { raw, band: listeningBand(raw), perQuestion };
}
