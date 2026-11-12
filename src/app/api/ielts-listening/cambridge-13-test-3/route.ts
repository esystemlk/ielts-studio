import { NextResponse } from 'next/server';
import { answerKey } from '@/lib/ielts-listening/answer-key-cam13-test-3.server';
import { gradeReadingAnswer } from '@/lib/ielts-reading/grading';
import data from '@/lib/ielts-listening/cambridge-13-test-3.json';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > 16000) return NextResponse.json({ error: 'Answer submission is too large.' }, { status: 413 });
    const { answers } = JSON.parse(body);
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return NextResponse.json({ error: 'Please submit your answers again.' }, { status: 400 });
    }
    const results = data.questions.filter(q => q.kind !== 'unavailable').map(question => {
      const value = answers[question.id] ?? '';
      if (typeof value !== 'string' || value.length > 200) throw new Error('Invalid answer');
      const accepted = answerKey[question.id];
      return {
        id: question.id, answer: value, accepted,
        correct: gradeReadingAnswer(value, accepted, question.kind === 'choice' ? 2 : question.wordLimit ?? 2),
      };
    });
    return NextResponse.json({ results, score: results.filter(r => r.correct).length, total: results.length }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Some answers could not be read. Please try again.' }, { status: 400 });
  }
}
