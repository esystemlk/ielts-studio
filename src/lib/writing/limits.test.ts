// Self-check for Writing plan limits. Run: npx tsx src/lib/writing/limits.test.ts
import assert from 'node:assert/strict';
import { writingAllowance, writingDay } from './limits';

const none = { today: {} };
// Free: one Task 2 essay ever, no Task 1.
assert.deepEqual(writingAllowance('free', 2, none), { ok: true, left: 0 });
assert.equal(writingAllowance('free', 2, { today: {}, freeTask2Used: 1 }).ok, false);
assert.equal(writingAllowance('free', 1, none).ok, false);
// Plus: 5 a day per task, counted separately.
assert.deepEqual(writingAllowance('plus', 1, { today: { task1: 4 } }), { ok: true, left: 0 });
assert.equal(writingAllowance('plus', 1, { today: { task1: 5 } }).ok, false);
assert.deepEqual(writingAllowance('plus', 2, { today: { task1: 5 } }), { ok: true, left: 4 });
// Unlimited: no limit.
assert.deepEqual(writingAllowance('unlimited', 2, { today: { task2: 99 } }), { ok: true, left: null });
// Day boundary is Sri Lanka midnight (18:30 UTC).
assert.equal(writingDay(new Date('2026-11-13T18:29:00Z')), '2026-11-13');
assert.equal(writingDay(new Date('2026-11-13T18:31:00Z')), '2026-11-14');
console.log('writing limits self-check passed');

// Speaking: paid plans only, fair-use cap per day.
import { speakingAllowance, SPEAKING_DAILY_FAIR_USE } from './limits';
assert.equal(speakingAllowance('free', 0).ok, false);
assert.deepEqual(speakingAllowance('plus', 0), { ok: true, left: SPEAKING_DAILY_FAIR_USE - 1 });
assert.equal(speakingAllowance('unlimited', SPEAKING_DAILY_FAIR_USE).ok, false);
console.log('speaking limits self-check passed');
