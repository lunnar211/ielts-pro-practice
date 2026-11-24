import fs from "fs";
import path from "path";
import type { IELTSTest } from "./types";

// NOTE: src/data/test-1.json and src/data/test-2.json are written by a
// parallel agent and may not exist yet. This loader therefore reads them
// from disk at runtime (server-side only) instead of statically importing
// them, so a missing file produces a clear runtime error rather than a
// build failure. Do not import this module from a Client Component.

const SEED_FILES = ["test-1.json", "test-2.json"];

function readTestFile(fileName: string): IELTSTest {
  const filePath = path.join(process.cwd(), "src", "data", fileName);
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(
      `Seed test file not found: src/data/${fileName}. ` +
        `The seed data has not been written yet — add src/data/${fileName} and try again.`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Seed test file is not valid JSON: src/data/${fileName}.`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Invalid test data in src/data/${fileName}: expected a JSON object.`);
  }
  const test = parsed as Partial<IELTSTest>;
  if (!test.id || typeof test.id !== "string") {
    throw new Error(`Invalid test data in src/data/${fileName}: missing string "id".`);
  }
  if (!test.title || typeof test.title !== "string") {
    throw new Error(`Invalid test data in src/data/${fileName}: missing string "title".`);
  }
  if (test.track !== "academic" && test.track !== "general") {
    throw new Error(
      `Invalid test data in src/data/${fileName}: "track" must be "academic" or "general".`
    );
  }
  if (!test.listening || !test.reading || !test.writing || !test.speaking) {
    throw new Error(
      `Invalid test data in src/data/${fileName}: missing listening, reading, writing or speaking section.`
    );
  }
  return parsed as IELTSTest;
}

let cachedTests: IELTSTest[] | null = null;

function loadTests(): IELTSTest[] {
  if (cachedTests) return cachedTests;
  cachedTests = SEED_FILES.map((file) => readTestFile(file));
  return cachedTests;
}

/** All seeded tests. Throws a clear error if a seed file is missing or malformed. */
export function listTests(): IELTSTest[] {
  return loadTests();
}

/** One test by id, or undefined when no test has that id. */
export function getTest(id: string): IELTSTest | undefined {
  return loadTests().find((t) => t.id === id);
}
