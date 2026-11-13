import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, uidFrom } from '@/lib/admin.server';
import { planOf } from '@/lib/plans';
import { speakingAllowance, writingDay } from '@/lib/writing/limits';
import { getSpeakingTest, partQuestions } from '@/lib/speaking/questions';
import { scoreSpeaking } from '@/lib/speaking/score.server';
import { AiBusyError } from '@/lib/writing/gemini.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // Vercel's request limit is 4.5 MB
const AUDIO = /^audio\/(webm|mp4|mpeg|ogg|wav|x-m4a|aac)/;

function refs(uid: string) {
  const user = adminDb().collection('users').doc(uid);
  return { user, dayRef: user.collection('studio_usage').doc(writingDay()) };
}

/** Whether this student can have a Speaking answer marked now. */
export async function GET(request: Request) {
  const who = await uidFrom(request);
  if (!who) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { user, dayRef } = refs(who.uid);
  const [p, d] = await Promise.all([user.get(), dayRef.get()]);
  const plan = planOf(p.data() ?? {});
  return NextResponse.json({ plan, allowance: speakingAllowance(plan, d.data()?.speaking ?? 0) });
}

/** Mark one Speaking part. Form fields: testId, part, audio0..audioN (one recording per question). */
export async function POST(request: Request) {
  const who = await uidFrom(request);
  if (!who) return NextResponse.json({ error: 'Please sign in.', code: 'UNAUTHENTICATED' }, { status: 401 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'No recordings were received.' }, { status: 400 });
  const test = getSpeakingTest(String(form.get('testId')));
  const part = Number(form.get('part'));
  if (!test || (part !== 1 && part !== 2 && part !== 3)) return NextResponse.json({ error: 'Unknown Speaking task.' }, { status: 400 });
  const questions = partQuestions(test, part);

  const items: { question: string; audio: Buffer; mimeType: string }[] = [];
  let total = 0;
  for (let i = 0; i < questions.length; i++) {
    const f = form.get(`audio${i}`);
    if (!(f instanceof Blob) || f.size === 0) continue; // a skipped question
    const mimeType = (f.type || 'audio/webm').split(';')[0];
    if (!AUDIO.test(mimeType)) return NextResponse.json({ error: 'Unsupported recording format.' }, { status: 415 });
    total += f.size;
    if (total > MAX_TOTAL_BYTES) return NextResponse.json({ error: 'The recordings are too large. Keep each answer within the time limit.' }, { status: 413 });
    items.push({ question: questions[i], audio: Buffer.from(await f.arrayBuffer()), mimeType });
  }
  if (!items.length) return NextResponse.json({ error: 'Record at least one answer first.' }, { status: 400 });

  const { user, dayRef } = refs(who.uid);
  // Reserve the slot first so quick double submits cannot pass the cap.
  let plan: ReturnType<typeof planOf>;
  try {
    plan = await adminDb().runTransaction(async tx => {
      const [p, d] = await Promise.all([tx.get(user), tx.get(dayRef)]);
      const pl = planOf(p.data() ?? {});
      const allow = speakingAllowance(pl, d.data()?.speaking ?? 0);
      if (!allow.ok) throw Object.assign(new Error(allow.reason), { limit: true });
      tx.set(dayRef, { speaking: FieldValue.increment(1) }, { merge: true });
      return pl;
    });
  } catch (e) {
    if ((e as { limit?: boolean }).limit) return NextResponse.json({ error: (e as Error).message, code: 'LIMIT' }, { status: 402 });
    throw e;
  }

  try {
    const result = await scoreSpeaking(part, test.theme, items);
    // Recordings are not stored: only the transcript and feedback.
    const saved = await user.collection('studio_speaking').add({ testId: test.id, part, band: result.overallBand, result, plan, createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ id: saved.id, result });
  } catch (e) {
    await dayRef.set({ speaking: FieldValue.increment(-1) }, { merge: true }).catch(() => {});
    if (e instanceof AiBusyError) return NextResponse.json({ error: 'The AI examiner is very busy right now. Please try again in a moment; your recordings are kept.', code: 'AI_BUSY' }, { status: 503 });
    console.error('[speaking] marking failed', e);
    return NextResponse.json({ error: 'Your answers could not be marked. Please try again; your recordings are kept.' }, { status: 500 });
  }
}
