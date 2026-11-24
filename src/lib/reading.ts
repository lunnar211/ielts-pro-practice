import { readingBand } from "./bands";
import type { IELTSTest } from "./types";

export interface PerQuestionResult {
  id: string;
  type: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  evidence: string;
}

export interface ReadingMarking {
  raw: number;
  band: number;
  perQuestion: PerQuestionResult[];
}

/**
 * Normalise an answer for comparison: trim, lowercase, collapse internal
 * whitespace to single spaces, and strip a single trailing full stop.
 * Spelling is otherwise significant — no fuzzy matching.
 */
export function normaliseAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\.$/, "");
}

/**
 * Mark a completed Reading test. A question is correct only when the
 * normalised student answer equals the normalised correct answer or one of
 * its normalised alternatives. Unanswered questions score 0.
 */
export function markReading(
  test: IELTSTest,
  answers: Record<string, string>
): ReadingMarking {
  const perQuestion: PerQuestionResult[] = [];
  let raw = 0;

  for (const passage of test.reading.passages) {
    for (const question of passage.questions) {
      const userAnswer = answers[question.id] ?? "";
      const normalisedUser = normaliseAnswer(userAnswer);
      const accepted = [question.answer, ...(question.alternatives ?? [])].map(
        normaliseAnswer
      );
      const correct =
        normalisedUser.length > 0 && accepted.includes(normalisedUser);
      if (correct) raw += 1;
      perQuestion.push({
        id: question.id,
        type: question.type,
        correct,
        userAnswer,
        correctAnswer: question.answer,
        evidence: question.evidence,
      });
    }
  }

  return { raw, band: readingBand(raw, test.track), perQuestion };
}
