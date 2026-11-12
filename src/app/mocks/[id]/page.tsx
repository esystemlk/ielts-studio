import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RequireAuth } from '@/components/require-auth';
import { MockRunner, type ListeningData, type ReadingData } from '@/components/mock/mock-runner';
import { IELTS_MOCKS, getMock } from '@/lib/ielts-mock/mocks';
import { getCambridge21WritingTest } from '@/lib/ielts-writing/cambridge-21';
import { loadTest } from '@/lib/catalog';

export const dynamicParams = false;
export const generateStaticParams = async () => IELTS_MOCKS.map(m => ({ id: m.id }));
export const metadata: Metadata = { title: 'Mock test' };

export default async function MockPage({ params }: { params: Promise<{ id: string }> }) {
  const mock = getMock((await params).id);
  const w = mock && getCambridge21WritingTest(mock.writingTestN);
  if (!mock || !w) notFound();
  // Question data only: answers stay on the server and marking happens on submit.
  const [listening, reading] = await Promise.all([loadTest('listening', mock.listening.testId), loadTest('reading', mock.reading.testId)]);
  const writing = { task1: { prompt: w.task1.prompt, image: w.task1.image, imageAlt: w.task1.imageAlt }, task2: { prompt: w.task2.prompt } };
  return (
    <RequireAuth>
      <MockRunner mock={mock} listening={listening as unknown as ListeningData} reading={reading as unknown as ReadingData} writing={writing} />
    </RequireAuth>
  );
}
