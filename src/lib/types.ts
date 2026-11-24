export type Track = 'academic' | 'general';

export interface ListeningQuestion {
  id: string;
  type: 'mcq' | 'completion' | 'matching' | 'labelling';
  prompt: string;
  options?: string[];
  answer: string;
  alternatives?: string[];
}

export interface ListeningSection {
  id: string;
  number: number;
  title: string;
  audioUrl: string | null;
  transcript: string;
  questions: ListeningQuestion[];
}

export interface ReadingQuestion {
  id: string;
  type:
    | 'tfng'
    | 'ynng'
    | 'matching-headings'
    | 'matching-information'
    | 'matching-features'
    | 'mcq'
    | 'completion'
    | 'short-answer';
  prompt: string;
  options?: string[];
  answer: string;
  alternatives?: string[];
  evidence: string;
}

export interface ReadingPassage {
  id: string;
  title: string;
  text: string;
  questions: ReadingQuestion[];
}

export interface WritingTask {
  type: 'chart' | 'table' | 'map' | 'process' | 'letter';
  prompt: string;
  chartDescription?: string;
  imageUrl?: string | null;
  minWords: number;
}

export interface SpeakingTest {
  part1: string[];
  part2: { topic: string; prompts: string[] };
  part3: string[];
}

export interface IELTSTest {
  id: string;
  title: string;
  track: Track;
  listening: { sections: ListeningSection[] };
  reading: { passages: ReadingPassage[] };
  writing: { task1: WritingTask; task2: { prompt: string; minWords: number } };
  speaking: SpeakingTest;
}

export interface CriterionScore {
  name: string;
  band: number;
  justification: string;
}

export interface AIMarkingResult {
  criteria: CriterionScore[];
  overallBand: number;
  strengths: string[];
  weaknesses: string[];
  correctedSentences: { original: string; corrected: string; explanation: string }[];
  improvementPlan: string[];
  modelAnswer?: string;
}
