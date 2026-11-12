import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SKILLS, SKILL_NAMES, testsFor, type Skill } from '@/lib/catalog';
import { FREE_BOOKS } from '@/lib/plans';

export const dynamicParams = false;
export const generateStaticParams = () => SKILLS.map(skill => ({ skill }));

export default async function SkillPage({ params }: { params: Promise<{ skill: string }> }) {
  const { skill } = await params;
  if (!(SKILLS as string[]).includes(skill)) notFound();
  const tests = testsFor(skill as Skill);
  const books = [...new Set(tests.map(t => t.book))];
  return (
    <main className="main catalog">
      <p className="label">Free practice · books {FREE_BOOKS.from}–{FREE_BOOKS.to}</p>
      <h1 className="catalog-title">{SKILL_NAMES[skill as Skill]}</h1>
      <p className="muted">Every test is free, with instant results. AI feedback on each part comes with Plus.</p>
      {books.map(book => (
        <section key={book} className="section">
          <h2 className="catalog-book">Book {book}</h2>
          <div className="catalog-grid">
            {tests.filter(t => t.book === book).map(t => (
              <Link key={t.id} className="catalog-card" href={`/practice/${skill}/${t.id}`}>
                <span className="label">Test {t.test}</span>
                <b>{SKILL_NAMES[skill as Skill]} test {t.test}</b>
                <span className="muted">40 questions · start →</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
