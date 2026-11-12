// IELTS band conversion for mock scoring. Client-safe (no server imports).
//
// Listening and Academic Reading use the widely published Cambridge raw-score
// (out of 40) → band tables. These are estimates for practice, not official
// conversions. Writing combines Task 1 and Task 2 with Task 2 double-weighted
// (the official method). The overall mock band is the mean of the three skill
// bands rounded to the nearest half band — (Listening + Reading + Writing) / 3.
import type { IeltsMockResult } from './types';

/** Round a raw value to the nearest half band, clamped to 0–9. */
export function toHalfBand(x: number): number {
  const clamped = Math.max(0, Math.min(9, x));
  return Math.round(clamped * 2) / 2;
}

type BandRow = { min: number; band: number };

// Academic Listening: raw (0–40) → band. Highest matching floor wins.
const LISTENING_TABLE: BandRow[] = [
  { min: 39, band: 9 }, { min: 37, band: 8.5 }, { min: 35, band: 8 },
  { min: 33, band: 7.5 }, { min: 30, band: 7 }, { min: 27, band: 6.5 },
  { min: 23, band: 6 }, { min: 20, band: 5.5 }, { min: 16, band: 5 },
  { min: 13, band: 4.5 }, { min: 11, band: 4 }, { min: 8, band: 3.5 },
  { min: 6, band: 3 }, { min: 4, band: 2.5 }, { min: 3, band: 2 },
  { min: 2, band: 1.5 }, { min: 1, band: 1 }, { min: 0, band: 0 },
];

// Academic Reading: raw (0–40) → band.
const READING_TABLE: BandRow[] = [
  { min: 39, band: 9 }, { min: 37, band: 8.5 }, { min: 35, band: 8 },
  { min: 33, band: 7.5 }, { min: 30, band: 7 }, { min: 27, band: 6.5 },
  { min: 23, band: 6 }, { min: 19, band: 5.5 }, { min: 15, band: 5 },
  { min: 13, band: 4.5 }, { min: 10, band: 4 }, { min: 8, band: 3.5 },
  { min: 6, band: 3 }, { min: 4, band: 2.5 }, { min: 3, band: 2 },
  { min: 2, band: 1.5 }, { min: 1, band: 1 }, { min: 0, band: 0 },
];

function lookup(table: BandRow[], raw: number): number {
  const r = Math.max(0, Math.min(40, Math.round(raw)));
  for (const row of table) if (r >= row.min) return row.band;
  return 0;
}

export function listeningBand(raw: number): number { return lookup(LISTENING_TABLE, raw); }
export function academicReadingBand(raw: number): number { return lookup(READING_TABLE, raw); }

/** Writing overall from the two task bands — Task 2 is weighted double. */
export function writingBand(task1Band: number, task2Band: number): number {
  return toHalfBand((task1Band + 2 * task2Band) / 3);
}

/** Overall mock band = mean of the three skill bands, rounded to nearest 0.5. */
export function overallMockBand(listening: number, reading: number, writing: number): number {
  return toHalfBand((listening + reading + writing) / 3);
}

/** A saved result with Listening replaced; Reading and Writing bands are kept. */
export function withListeningScore(result: IeltsMockResult, raw: number, total: number): IeltsMockResult {
  const band = listeningBand(raw);
  const overall = overallMockBand(band, result.reading.band, result.writing.band);
  return { ...result, overall, overallLabel: bandLabel(overall), listening: { ...result.listening, band, raw, total } };
}

export function bandLabel(band: number): string {
  if (band >= 9) return 'Expert User';
  if (band >= 8) return 'Very Good User';
  if (band >= 7) return 'Good User';
  if (band >= 6) return 'Competent User';
  if (band >= 5) return 'Modest User';
  if (band >= 4) return 'Limited User';
  if (band >= 3) return 'Extremely Limited User';
  if (band >= 2) return 'Intermittent User';
  if (band >= 1) return 'Non-User';
  return 'Did Not Attempt';
}
