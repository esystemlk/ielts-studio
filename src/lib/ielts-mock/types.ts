import type { IeltsEssayResult } from '@/types/ielts-essay';

// Shape returned by /api/ielts-mock/score and persisted to
// users/{uid}/ielts_mock_attempts/{id}.result for history + PDF download.

export interface MockSkillBreakdown {
  band: number;
  raw?: number;
  total?: number;
  label: string;
}

export interface MockReviewQuestion {
  id: number;
  prompt: string;
  given: string;
  correct: boolean;
  accepted: string[];
  options?: { letter: string; text: string }[];
}

/** Null means that section's answers were not saved for this older attempt. */
export interface IeltsMockReview {
  listening: MockReviewQuestion[] | null;
  reading: MockReviewQuestion[] | null;
}

export interface IeltsMockResult {
  mockId: string;
  title: string;
  overall: number;
  overallLabel: string;
  listening: MockSkillBreakdown;
  reading: MockSkillBreakdown;
  writing: MockSkillBreakdown & {
    task1Band: number;
    task2Band: number;
    task1: IeltsEssayResult;
    task2: IeltsEssayResult;
    task1Question?: string;
    task1Response?: string;
    task2Question?: string;
    task2Response?: string;
  };
  scoredAt?: string;
  /** Set by the score route: whether the result email was sent, for display. */
  emailStatus?: { sent: boolean; detail: string };
}
