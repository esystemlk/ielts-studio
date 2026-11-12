import { notFound } from 'next/navigation';
import { ReadingRunner, type TestData } from '@/components/ielts/reading-runner';
import { ListeningRunner, type ListeningTestData } from '@/components/ielts/listening-runner';
import { SKILLS, isCatalogTest, loadTest, testsFor } from '@/lib/catalog';

export const dynamicParams = false;
export const generateStaticParams = async () => SKILLS.flatMap(skill => testsFor(skill).map(t => ({ skill, id: t.id })));

export default async function TestPage({ params }: { params: Promise<{ skill: string; id: string }> }) {
  const { skill, id } = await params;
  if (!isCatalogTest(skill, id)) notFound();
  const data = await loadTest(skill as 'reading' | 'listening', id);
  return skill === 'reading'
    ? <ReadingRunner data={data as unknown as TestData} />
    : <ListeningRunner data={data as unknown as ListeningTestData} />;
}
