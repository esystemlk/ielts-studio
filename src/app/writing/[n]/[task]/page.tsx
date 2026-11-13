import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RequireAuth } from '@/components/require-auth';
import { WritingPractice } from '@/components/writing-practice';
import { CAMBRIDGE_21_WRITING, getCambridge21WritingTest } from '@/lib/ielts-writing/cambridge-21';

export const dynamicParams = false;
export const generateStaticParams = async () => CAMBRIDGE_21_WRITING.flatMap(t => [{ n: String(t.n), task: '1' }, { n: String(t.n), task: '2' }]);
export const metadata: Metadata = { title: 'Writing practice' };

export default async function Page({ params }: { params: Promise<{ n: string; task: string }> }) {
  const { n, task } = await params;
  const test = getCambridge21WritingTest(Number(n));
  if (!test || (task !== '1' && task !== '2')) notFound();
  const t = task === '1'
    ? { prompt: test.task1.prompt, image: test.task1.image, imageAlt: test.task1.imageAlt, visualType: test.task1.visualType }
    : { prompt: test.task2.prompt };
  return <RequireAuth><WritingPractice testN={test.n} title={`Cambridge ${test.book} · ${test.title}`} task={task === '1' ? 1 : 2} t={t} /></RequireAuth>;
}
