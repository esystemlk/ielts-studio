// Shared IELTS Writing Task 2 scoring types.
//
// IELTS is marked on four official criteria — Task Response, Coherence &
// Cohesion, Lexical Resource, Grammatical Range & Accuracy — each on the 0–9
// band scale (half bands allowed). The overall band is the mean of the four,
// rounded to the nearest half band. This mirrors the shape of the PTE essay
// types (src/types/essay.ts) but on the IELTS scale.

// TR = Task Response (Task 2 essays) · TA = Task Achievement (Task 1 reports).
export type IeltsCriterionCode = 'TR' | 'TA' | 'CC' | 'LR' | 'GRA';

/** One of the four official criteria. Extra fields are per-criterion. */
export interface IeltsCriterion {
  code: IeltsCriterionCode;
  name: string;
  band: number;            // 0–9, half bands allowed
  reason: string;
  strengths: string[];
  weaknesses: string[];

  // Task Response / Coherence & Cohesion
  evidence?: string[];

  // Lexical Resource
  goodVocabulary?: string[];
  vocabularyErrors?: string[];
  collocationErrors?: string[];
  spellingErrors?: string[];

  // Grammatical Range & Accuracy
  sentenceStructureErrors?: string[];
  grammarErrors?: string[];
  punctuationErrors?: string[];
}

export interface IeltsBand9Suggestions {
  vocabulary: string;
  grammar: string;
  ideaDevelopment: string;
  organization: string;
}

/** Full evaluation returned by /api/score-ielts-essay. */
export interface IeltsEssayResult {
  /** Agree/Disagree · Discussion · Advantages/Disadvantages · Problem/Solution · Double Question */
  questionType: string;
  estimatedWordCount: number;

  criteria: IeltsCriterion[];

  /** Mean of the four bands, rounded to the nearest 0.5 — computed server-side. */
  overallBand: number;
  bandLabel: string;
  overallExplanation: string;

  majorErrors: string[];
  /** The three most important improvements to reach the next band. */
  bandImprovementAdvice: string[];
  band9Suggestions: IeltsBand9Suggestions;

  /** Optional target-band gap analysis, when the student sets a target. */
  targetBandAnalysis?: IeltsTargetBandAnalysis | null;

  _metadata?: { modelUsed: string };
}

export interface IeltsTargetBandAnalysis {
  achieved: boolean;
  gap: number;              // how far below target, in bands (0 if reached)
  primaryReasons: string[];
  criteriaGaps: { criterion: string; currentBand: number; targetApprox: number; whatToDo: string }[];
  studyPriority: string;
  realisticTimeline: string;
}

// A persisted scoring session (Firestore: users/{uid}/ielts_essay_sessions/{id})
export interface IeltsEssaySession {
  id?: string;
  topic: string;
  topicId: string | null;
  essayText: string;
  wordCount: number;
  targetBand: number | null;
  result: IeltsEssayResult;
  createdAt?: unknown; // Firestore Timestamp on read, serverTimestamp() on write
}

// ─── Band helpers ───────────────────────────────────────────────────────────

/** Official IELTS overall: mean of the four criteria, rounded to nearest 0.5. */
export function ieltsOverallBand(bands: number[]): number {
  if (!bands.length) return 0;
  const clamp = (b: number) => Math.max(0, Math.min(9, b));
  const mean = bands.reduce((s, b) => s + clamp(b), 0) / bands.length;
  // Round to the nearest half band (6.25 → 6.5, 6.75 → 7.0).
  return Math.round(mean * 2) / 2;
}

/** CEFR-aligned descriptor for a whole/half band. */
export function ieltsBandLabel(band: number): string {
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
