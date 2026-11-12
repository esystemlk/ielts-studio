// IELTS Studio packages (decided 12 Nov 2026). Prices in USD.
// Plus and Unlimited are paid manually each month: each payment sets studioPlan + studioPlanExpiry
// on users/{uid} (one month of access). Mock tests are separate credits ($5 each).
import type { Timestamp } from 'firebase/firestore';

export type StudioPlan = 'free' | 'plus' | 'unlimited';
export const PLAN_PRICES = { free: 0, plus: 15, unlimited: 35, mock: 5 } as const;

/** Free practice covers these books for Listening and Reading. */
export const FREE_BOOKS = { from: 15, to: 21 } as const;

/** Daily Writing limits per task (Task 1 and Task 2 counted separately). null = no limit. */
export const WRITING_LIMITS: Record<StudioPlan, { task1: number | null; task2: number | null; task2Lifetime?: number }> = {
  free: { task1: 0, task2: 0, task2Lifetime: 1 },
  plus: { task1: 5, task2: 5 },
  unlimited: { task1: null, task2: null },
};

const STAFF = new Set(['admin', 'developer', 'teacher']);

/** Current plan from the shared users/{uid} profile. Staff get Unlimited; an expired plan is Free. */
export function planOf(profile: Record<string, unknown> | null | undefined): StudioPlan {
  if (!profile) return 'free';
  if (STAFF.has(String(profile.role))) return 'unlimited';
  const plan = profile.studioPlan;
  const expiry = (profile.studioPlanExpiry as Timestamp | undefined)?.toDate?.();
  if ((plan === 'plus' || plan === 'unlimited') && expiry && expiry > new Date()) return plan;
  return 'free';
}

export const planLabel: Record<StudioPlan, string> = { free: 'Free', plus: 'Plus', unlimited: 'Unlimited' };
