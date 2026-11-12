// IELTS mock-test definitions (client-safe metadata).
//
// Each full mock covers three skills (speaking is done in person):
//   • Listening — a full 40-question test (4 parts) from Cambridge 21 or 20.
//   • Reading   — a full 40-question Academic test from a DIFFERENT book, so
//                 the listening and reading never come from the same set.
//   • Writing   — Task 1 + Task 2 from Cambridge 21, AI-scored.
//
// The overall band = (Listening + Reading + Writing) / 3, rounded to 0.5.
// Reading is timed at 60 minutes and Writing at 60 minutes; Listening is
// audio-driven (each part plays once, then 15s, then auto-advance).

export interface IeltsMockSkillRef {
  /** Data id, e.g. "cambridge-21-test-1". */
  testId: string;
  /** Human label, e.g. "Cambridge 21 · Test 1". */
  label: string;
}

export interface IeltsMockDef {
  id: string;            // "mock-1"
  title: string;         // "IELTS Mock Test 1"
  listening: IeltsMockSkillRef;
  reading: IeltsMockSkillRef;
  /** Index into CAMBRIDGE_21_WRITING (1–4). */
  writingTestN: number;
  writingLabel: string;
}

export const READING_MINUTES = 60;
export const WRITING_MINUTES = 60;
/** Seconds between the end of a listening part's audio and the next part. */
export const LISTENING_PART_GAP_SECONDS = 15;

export const IELTS_MOCKS: IeltsMockDef[] = [
  {
    id: 'mock-1', title: 'IELTS Mock Test 1',
    listening: { testId: 'cambridge-21-test-1', label: 'Cambridge 21 · Test 1' },
    reading: { testId: 'cambridge-20-test-1', label: 'Cambridge 20 · Test 1' },
    writingTestN: 1, writingLabel: 'Cambridge 21 · Writing Test 1',
  },
  {
    id: 'mock-2', title: 'IELTS Mock Test 2',
    listening: { testId: 'cambridge-21-test-2', label: 'Cambridge 21 · Test 2' },
    reading: { testId: 'cambridge-19-test-1', label: 'Cambridge 19 · Test 1' },
    writingTestN: 2, writingLabel: 'Cambridge 21 · Writing Test 2',
  },
  {
    id: 'mock-3', title: 'IELTS Mock Test 3',
    listening: { testId: 'cambridge-20-test-1', label: 'Cambridge 20 · Test 1' },
    reading: { testId: 'cambridge-18-test-1', label: 'Cambridge 18 · Test 1' },
    writingTestN: 3, writingLabel: 'Cambridge 21 · Writing Test 3',
  },
  {
    id: 'mock-4', title: 'IELTS Mock Test 4',
    listening: { testId: 'cambridge-20-test-2', label: 'Cambridge 20 · Test 2' },
    reading: { testId: 'cambridge-17-test-1', label: 'Cambridge 17 · Test 1' },
    writingTestN: 4, writingLabel: 'Cambridge 21 · Writing Test 4',
  },
];

export function getMock(id: string): IeltsMockDef | undefined {
  return IELTS_MOCKS.find(m => m.id === id);
}
