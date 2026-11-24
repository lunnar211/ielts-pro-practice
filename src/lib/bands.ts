export function roundToNearestHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/** Convert a raw Listening score (out of 40) to an IELTS band. */
export function listeningBand(raw: number): number {
  if (raw >= 39) return 9;
  if (raw >= 37) return 8.5;
  if (raw >= 35) return 8;
  if (raw >= 33) return 7.5;
  if (raw >= 30) return 7;
  if (raw >= 27) return 6.5;
  if (raw >= 23) return 6;
  if (raw >= 20) return 5.5;
  if (raw >= 16) return 5;
  if (raw >= 13) return 4.5;
  if (raw >= 10) return 4;
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
    if (raw >= 40) return 9;
    if (raw === 39) return 8.5;
    if (raw >= 37) return 8;
    if (raw === 36) return 7.5;
    if (raw >= 34) return 7;
    if (raw >= 32) return 6.5;
    if (raw >= 30) return 6;
    if (raw >= 27) return 5.5;
    if (raw >= 23) return 5;
    if (raw >= 19) return 4.5;
    if (raw >= 15) return 4;
    if (raw >= 12) return 3.5;
    if (raw >= 9) return 3;
    if (raw >= 6) return 2.5;
    if (raw >= 4) return 2;
    if (raw === 3) return 1.5;
    if (raw >= 1) return 1;
    return 0;
  }
  // Academic
  if (raw >= 39) return 9;
  if (raw >= 37) return 8.5;
  if (raw >= 35) return 8;
  if (raw >= 33) return 7.5;
  if (raw >= 30) return 7;
  if (raw >= 27) return 6.5;
  if (raw >= 23) return 6;
  if (raw >= 19) return 5.5;
  if (raw >= 15) return 5;
  if (raw >= 13) return 4.5;
  if (raw >= 10) return 4;
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

/** Overall IELTS band: mean of the four module bands, rounded to the nearest half. */
export function overallBand(l: number, r: number, w: number, s: number): number {
  return roundToNearestHalf((l + r + w + s) / 4);
}
