import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, uidFrom } from '@/lib/admin.server';
import { planOf } from '@/lib/plans';
import { getCambridge21WritingTest } from '@/lib/ielts-writing/cambridge-21';
import { writingAllowance, writingDay, type WritingUsage } from '@/lib/writing/limits';
import { scoreWriting } from '@/lib/writing/score.server';
import { AiBusyError } from '@/lib/writing/gemini.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_CHARS = 12_000;

async function context(uid: string) {
  const db = adminDb();
  const user = db.collection('users').doc(uid);
  const dayRef = user.collection('studio_usage').doc(writingDay());
  const lifeRef = user.collection('studio_usage').doc('lifetime');
  const [p, d, l] = await Promise.all([user.get(), dayRef.get(), lifeRef.get()]);
  const usage: WritingUsage = { today: d.data() ?? {}, freeTask2Used: l.data()?.freeTask2 ?? 0 };
  return { db, user, dayRef, lifeRef, profile: p.data() ?? {}, usage };
}

/** What this student can still submit (for the Writing page). */
export async function GET(request: Request) {
  const who = await uidFrom(request);
  if (!who) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { profile, usage } = await context(who.uid);
  const plan = planOf(profile);
  return NextResponse.json({ plan, task1: writingAllowance(plan, 1, usage), task2: writingAllowance(plan, 2, usage) });
}

/** Mark one Writing answer, within the student's plan limits. */
export async function POST(request: Request) {
  const who = await uidFrom(request);
  if (!who) return NextResponse.json({ error: 'Please sign in.', code: 'UNAUTHENTICATED' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const task = body.task === 1 ? 1 : body.task === 2 ? 2 : null;
  const test = getCambridge21WritingTest(Number(body.testN));
  const response = String(body.response ?? '').trim();
  const targetBand = typeof body.targetBand === 'number' ? body.targetBand : undefined;
  if (!task || !test) return NextResponse.json({ error: 'Unknown Writing task.' }, { status: 400 });
  const words = response.split(/\s+/).filter(Boolean).length;
  if (words < 30) return NextResponse.json({ error: 'Write at least 30 words before asking for feedback.' }, { status: 400 });
  if (response.length > MAX_CHARS) return NextResponse.json({ error: 'That answer is too long to mark.' }, { status: 413 });

  const { db, dayRef, lifeRef, user } = await context(who.uid);
  const field = task === 1 ? 'task1' : 'task2';

  // Reserve the slot in a transaction so two quick submits cannot both slip under the limit.
  let plan: ReturnType<typeof planOf>;
  let freeUse = false;
  try {
    plan = await db.runTransaction(async tx => {
      const [p, d, l] = await Promise.all([tx.get(user), tx.get(dayRef), tx.get(lifeRef)]);
      const pl = planOf(p.data() ?? {});
      const allow = writingAllowance(pl, task, { today: d.data() ?? {}, freeTask2Used: l.data()?.freeTask2 ?? 0 });
      if (!allow.ok) throw Object.assign(new Error(allow.reason), { limit: true });
      tx.set(dayRef, { [field]: FieldValue.increment(1) }, { merge: true });
      if (pl === 'free') { freeUse = true; tx.set(lifeRef, { freeTask2: FieldValue.increment(1) }, { merge: true }); }
      return pl;
    });
  } catch (e) {
    if ((e as { limit?: boolean }).limit) return NextResponse.json({ error: (e as Error).message, code: 'LIMIT' }, { status: 402 });
    throw e;
  }

  try {
    const result = await scoreWriting(new URL(request.url).origin, test, task, response, targetBand);
    const saved = await user.collection('studio_writing').add({
      testN: test.n, task, prompt: task === 1 ? test.task1.prompt : test.task2.prompt,
      response, words, band: result.overallBand, result, plan, createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: saved.id, result });
  } catch (e) {
    // Marking failed: give the slot back so the student is not charged a try.
    await dayRef.set({ [field]: FieldValue.increment(-1) }, { merge: true }).catch(() => {});
    if (freeUse) await lifeRef.set({ freeTask2: FieldValue.increment(-1) }, { merge: true }).catch(() => {});
    if (e instanceof AiBusyError) return NextResponse.json({ error: 'The AI marker is very busy right now. Please wait a moment and try again; your answer is kept.', code: 'AI_BUSY' }, { status: 503 });
    console.error('[writing] marking failed', e);
    return NextResponse.json({ error: 'Your answer could not be marked. Please try again; your answer is kept.' }, { status: 500 });
  }
}
