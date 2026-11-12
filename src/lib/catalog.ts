// Practice tests available in IELTS Studio: the question files copied from smartlabs.lk,
// limited to the free books (15–21). Listening books 16–19 do not exist in the source data.
import { FREE_BOOKS } from './plans';

export type Skill = 'reading' | 'listening';
export const SKILLS: Skill[] = ['listening', 'reading'];
export const SKILL_NAMES: Record<Skill, string> = { listening: 'Listening', reading: 'Reading' };

const LISTENING_BOOKS = [15, 20, 21];
const READING_BOOKS = [15, 16, 17, 18, 19, 20, 21];

export interface CatalogTest { id: string; skill: Skill; book: number; test: number }

export function testsFor(skill: Skill): CatalogTest[] {
  const books = (skill === 'listening' ? LISTENING_BOOKS : READING_BOOKS).filter(b => b >= FREE_BOOKS.from && b <= FREE_BOOKS.to);
  return books.sort((a, b) => b - a).flatMap(book => [1, 2, 3, 4].map(test => ({ id: `cambridge-${book}-test-${test}`, skill, book, test })));
}

/** True only for ids in the catalog, so a URL can never load a file outside it. */
export const isCatalogTest = (skill: string, id: string) =>
  (SKILLS as string[]).includes(skill) && testsFor(skill as Skill).some(t => t.id === id);

/** Loads one test's question data (no answers; marking stays in the API routes). */
export async function loadTest(skill: Skill, id: string): Promise<Record<string, unknown>> {
  const mod = skill === 'reading'
    ? await import(`./ielts-reading/${id}.json`)
    : await import(`./ielts-listening/${id}.json`);
  return (mod.default ?? mod) as Record<string, unknown>;
}
