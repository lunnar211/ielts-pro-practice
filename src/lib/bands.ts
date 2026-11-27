// IELTS band conversion.
//
// Sources (checked 27 Nov 2026):
// - IDP IELTS, "IELTS band scores – How they are calculated"
//   https://ielts.idp.com/nepal/results/scores
//   Reference points: Listening 40→9, 35→8, 30→7, 23→6, 16→5;
//   Reading Academic 40→9, 35→8, 30→7, 23→6, 15→5;
//   Reading General Training 35→7, 30→6, 23→5, 15→4.
// - British Council, "How is IELTS assessed?"
//   https://takeielts.britishcouncil.org/results/how-is-ielts-assessed
// - The full half-band tables below are the widely published conversion
//   tables used by IELTS/IDP/British Council/Cambridge preparation
//   materials. They agree with every IDP reference point above.
// - IMPORTANT: IELTS publishes these as averages. The exact marks needed
//   for a band vary slightly between test versions, so every band computed
//   here is an estimate, not a prediction of a real test result. IELTS
//   publishes no conversion below Band 4.0; values below 4.0 in the
//   functions below are estimates for practice use only.

export function roundToNearestHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/** One row of a published raw-score → band conversion table. */
export interface BandRow {
  /** Lowest raw score in this row (out of 40). */
  min: number;
  /** Highest raw score in this row (out of 40). */
  max: number;
  band: number;
}

/** Published Listening table (same for Academic and General Training). */
export const LISTENING_TABLE: BandRow[] = [
  { min: 39, max: 40, band: 9 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8 },
  { min: 32, max: 34, band: 7.5 },
  { min: 30, max: 31, band: 7 },
  { min: 26, max: 29, band: 6.5 },
  { min: 23, max: 25, band: 6 },
  { min: 18, max: 22, band: 5.5 },
  { min: 16, max: 17, band: 5 },
  { min: 13, max: 15, band: 4.5 },
  { min: 10, max: 12, band: 4 },
];

/** Published Academic Reading table. */
export const READING_ACADEMIC_TABLE: BandRow[] = [
  { min: 39, max: 40, band: 9 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8 },
  { min: 33, max: 34, band: 7.5 },
  { min: 30, max: 32, band: 7 },
  { min: 27, max: 29, band: 6.5 },
  { min: 23, max: 26, band: 6 },
  { min: 19, max: 22, band: 5.5 },
  { min: 15, max: 18, band: 5 },
  { min: 13, max: 14, band: 4.5 },
  { min: 10, max: 12, band: 4 },
];

/** Published General Training Reading table. */
export const READING_GENERAL_TABLE: BandRow[] = [
  { min: 40, max: 40, band: 9 },
  { min: 39, max: 39, band: 8.5 },
  { min: 37, max: 38, band: 8 },
  { min: 36, max: 36, band: 7.5 },
  { min: 34, max: 35, band: 7 },
  { min: 32, max: 33, band: 6.5 },
  { min: 30, max: 31, band: 6 },
  { min: 27, max: 29, band: 5.5 },
  { min: 23, max: 26, band: 5 },
  { min: 19, max: 22, band: 4.5 },
  { min: 15, max: 18, band: 4 },
];

/** Lowest raw score (out of 40) that reaches `band` in `table`, or null. */
export function rawNeededForBand(table: BandRow[], band: number): number | null {
  const row = table.find((r) => r.band === band);
  return row ? row.min : null;
}

/** Convert a raw score to a band using a published table. Below the
 *  published floor (Band 4.0) the result is an estimate, not a published
 *  conversion — see the module note above. */
function bandFromTable(table: BandRow[], raw: number, estimateBelow: number): number {
  for (const row of table) {
    if (raw >= row.min && raw <= row.max) return row.band;
  }
  return estimateBelow;
}

/** Convert a raw Listening score (out of 40) to an IELTS band. */
export function listeningBand(raw: number): number {
  if (raw >= 10) return bandFromTable(LISTENING_TABLE, raw, 4);
  // Below the published floor: estimates for practice use only.
  if (raw >= 8) return 3.5;
  if (raw >= 6) return 3;
  if (raw >= 4) return 2.5;
  if (raw === 3) return 2;
  if (raw === 2) return 1.5;
  if (raw === 1) return 1;
  return 0;
}

/** Convert a raw Reading score (out of 40) to an IELTS band. Academic and General use different tables. */
export function readingBand(raw: number, track: 'academic' | 'general'): number {
  if (track === 'general') {
    if (raw >= 15) return bandFromTable(READING_GENERAL_TABLE, raw, 4);
    // Below the published floor: estimates for practice use only.
    if (raw >= 12) return 3.5;
    if (raw >= 9) return 3;
    if (raw >= 6) return 2.5;
    if (raw >= 4) return 2;
    if (raw === 3) return 1.5;
    if (raw >= 1) return 1;
    return 0;
  }
  // Academic
  if (raw >= 10) return bandFromTable(READING_ACADEMIC_TABLE, raw, 4);
  // Below the published floor: estimates for practice use only.
  if (raw >= 8) return 3.5;
  if (raw >= 6) return 3;
  if (raw >= 4) return 2.5;
  if (raw === 3) return 2;
  if (raw === 2) return 1.5;
  if (raw === 1) return 1;
  return 0;
}

/** Writing overall band: Task 2 counts double. */
export function writingOverallBand(t1: number, t2: number): number {
  return roundToNearestHalf((t1 + 2 * t2) / 3);
}

/** Overall IELTS band: mean of the four module bands, rounded to the nearest half.
 *  Matches the official rule: an average ending in .25 rounds up to the next
 *  half band (6.25 → 6.5) and one ending in .75 rounds up to the next whole
 *  band (6.75 → 7.0). */
export function overallBand(l: number, r: number, w: number, s: number): number {
  return roundToNearestHalf((l + r + w + s) / 4);
}
