import { WRITING_LIMITS, type StudioPlan } from '@/lib/plans';

/** Writing days run on Sri Lanka time (UTC+5:30), so "5 a day" resets at local midnight. */
export function writingDay(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export interface WritingUsage { today: { task1?: number; task2?: number }; freeTask2Used?: number }
export type Allowance = { ok: true; left: number | null } | { ok: false; reason: string };

/** Can this student submit one more answer for this task? `left` is what remains after it (null = no limit). */
export function writingAllowance(plan: StudioPlan, task: 1 | 2, usage: WritingUsage): Allowance {
  const lim = WRITING_LIMITS[plan];
  const daily = task === 1 ? lim.task1 : lim.task2;
  if (plan === 'free') {
    if (task === 1) return { ok: false, reason: 'Writing Task 1 feedback is part of Plus and Unlimited.' };
    const used = usage.freeTask2Used ?? 0, max = lim.task2Lifetime ?? 0;
    return used < max ? { ok: true, left: max - used - 1 } : { ok: false, reason: 'You have used your free Task 2 essay. Upgrade to Plus to keep getting feedback.' };
  }
  if (daily === null) return { ok: true, left: null };
  const used = (task === 1 ? usage.today.task1 : usage.today.task2) ?? 0;
  return used < daily ? { ok: true, left: daily - used - 1 } : { ok: false, reason: `You have used today's ${daily} Task ${task} answers. Your limit resets at midnight (Sri Lanka time), or go Unlimited.` };
}

/** Speaking is a Plus/Unlimited feature. Fair-use cap per Sri Lanka day to keep AI costs predictable. */
export const SPEAKING_DAILY_FAIR_USE = 20;
export function speakingAllowance(plan: StudioPlan, usedToday: number): Allowance {
  if (plan === 'free') return { ok: false, reason: 'Speaking practice is part of Plus and Unlimited.' };
  return usedToday < SPEAKING_DAILY_FAIR_USE
    ? { ok: true, left: SPEAKING_DAILY_FAIR_USE - usedToday - 1 }
    : { ok: false, reason: `You have had ${SPEAKING_DAILY_FAIR_USE} Speaking answers marked today. Your limit resets at midnight (Sri Lanka time).` };
}
