import 'server-only';
import { gradeReadingAnswer } from '@/lib/ielts-reading/grading';
import type { MockReviewQuestion } from '@/lib/ielts-mock/types';

// Listening data + answer keys
import l21t1 from '@/lib/ielts-listening/cambridge-21-test-1.json';
import l21t2 from '@/lib/ielts-listening/cambridge-21-test-2.json';
import l20t1 from '@/lib/ielts-listening/cambridge-20-test-1.json';
import l20t2 from '@/lib/ielts-listening/cambridge-20-test-2.json';
import { answerKey as k_l21t1 } from '@/lib/ielts-listening/answer-key-cam21-test-1.server';
import { answerKey as k_l21t2 } from '@/lib/ielts-listening/answer-key-cam21-test-2.server';
import { answerKey as k_l20t1 } from '@/lib/ielts-listening/answer-key-cam20-test-1.server';
import { answerKey as k_l20t2 } from '@/lib/ielts-listening/answer-key-cam20-test-2.server';

// Reading data + answer keys
import r20t1 from '@/lib/ielts-reading/cambridge-20-test-1.json';
import r19t1 from '@/lib/ielts-reading/cambridge-19-test-1.json';
import r18t1 from '@/lib/ielts-reading/cambridge-18-test-1.json';
import r17t1 from '@/lib/ielts-reading/cambridge-17-test-1.json';
import { answerKey as k_r20t1 } from '@/lib/ielts-reading/answer-key-cambridge-20-test-1.server';
import { answerKey as k_r19t1 } from '@/lib/ielts-reading/answer-key-cambridge-19-test-1.server';
import { answerKey as k_r18t1 } from '@/lib/ielts-reading/answer-key-cambridge-18-test-1.server';
import { answerKey as k_r17t1 } from '@/lib/ielts-reading/answer-key-cambridge-17-test-1.server';

type AnswerKey = Record<string, string[]>;
interface TestBundle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: { questions: Array<{ id: number; kind: string; wordLimit?: number }> } & any;
  key: AnswerKey;
}

const LISTENING: Record<string, TestBundle> = {
  'cambridge-21-test-1': { data: l21t1, key: k_l21t1 },
  'cambridge-21-test-2': { data: l21t2, key: k_l21t2 },
  'cambridge-20-test-1': { data: l20t1, key: k_l20t1 },
  'cambridge-20-test-2': { data: l20t2, key: k_l20t2 },
};

const READING: Record<string, TestBundle> = {
  'cambridge-20-test-1': { data: r20t1, key: k_r20t1 },
  'cambridge-19-test-1': { data: r19t1, key: k_r19t1 },
  'cambridge-18-test-1': { data: r18t1, key: k_r18t1 },
  'cambridge-17-test-1': { data: r17t1, key: k_r17t1 },
};

export function getListeningBundle(testId: string): TestBundle | undefined { return LISTENING[testId]; }
export function getReadingBundle(testId: string): TestBundle | undefined { return READING[testId]; }

type LetterOption = { letter: string; text: string };
type GradableQuestion = { id: number; kind: string; prompt?: string; wordLimit?: number; choices?: LetterOption[] };

const gradableQuestions = (bundle: TestBundle): GradableQuestion[] =>
  bundle.data.questions.filter((q: GradableQuestion) => q.kind !== 'unavailable');

function isCorrect(bundle: TestBundle, q: GradableQuestion, value: unknown): boolean {
  const accepted = bundle.key[q.id];
  if (!accepted || typeof value !== 'string') return false;
  return gradeReadingAnswer(value, accepted, q.kind === 'choice' ? 2 : q.wordLimit ?? 2);
}

/** Grade a submitted answer map against a test's key. Returns raw correct / total. */
export function gradeTest(bundle: TestBundle, answers: Record<string, unknown>): { raw: number; total: number } {
  const gradable = gradableQuestions(bundle);
  return { raw: gradable.filter(q => isCorrect(bundle, q, answers?.[q.id])).length, total: gradable.length };
}

/** Browser answers reduced to known question ids and bounded strings, safe to store. */
export function savedAnswers(bundle: TestBundle, answers: Record<string, unknown> | undefined): Record<string, string> {
  return Object.fromEntries(gradableQuestions(bundle).flatMap(q => {
    const value = answers?.[q.id];
    return typeof value === 'string' ? [[String(q.id), value.slice(0, 200)]] : [];
  }));
}

/** One row per question for the student's review. Includes the answer key. */
export function reviewTest(bundle: TestBundle, answers: Record<string, unknown>): MockReviewQuestion[] {
  const groups: Record<string, { matchOptions?: LetterOption[] }> = bundle.data.groups ?? {};
  return gradableQuestions(bundle).map(q => {
    const start = Math.max(...Object.keys(groups).map(Number).filter(s => s <= q.id));
    const value = answers?.[q.id];
    return {
      id: q.id,
      prompt: q.prompt ?? '',
      given: typeof value === 'string' ? value : '',
      correct: isCorrect(bundle, q, value),
      accepted: bundle.key[q.id] ?? [],
      options: q.choices ?? groups[String(start)]?.matchOptions,
    };
  });
}
