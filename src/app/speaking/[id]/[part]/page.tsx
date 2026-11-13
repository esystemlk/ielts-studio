import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RequireAuth } from '@/components/require-auth';
import { SpeakingPractice } from '@/components/speaking-practice';
import { SPEAKING_TESTS, getSpeakingTest, partQuestions } from '@/lib/speaking/questions';

export const dynamicParams = false;
export const generateStaticParams = async () => SPEAKING_TESTS.flatMap(t => ['1', '2', '3'].map(part => ({ id: t.id, part })));
export const metadata: Metadata = { title: 'Speaking practice' };

export default async function Page({ params }: { params: Promise<{ id: string; part: string }> }) {
  const { id, part } = await params;
  const test = getSpeakingTest(id);
  const p = Number(part);
  if (!test || (p !== 1 && p !== 2 && p !== 3)) notFound();
  return (
    <RequireAuth>
      <SpeakingPractice testId={test.id} theme={test.theme} part={p} questions={partQuestions(test, p)} cue={p === 2 ? test.part2 : undefined} />
    </RequireAuth>
  );
}
