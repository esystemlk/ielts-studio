import { ieltsBandLabel, ieltsOverallBand, type IeltsCriterion } from '@/types/ielts-essay';
import { generateWithFailover } from '@/lib/writing/gemini.server';

export interface SpeakingAnswer { question: string; transcript: string; better: string }
export interface SpeakingResult {
  part: 1 | 2 | 3;
  overallBand: number;
  bandLabel: string;
  overallExplanation: string;
  criteria: IeltsCriterion[];
  answers: SpeakingAnswer[];
  bandImprovementAdvice: string[];
  _metadata?: { modelUsed: string };
}

const SYSTEM = `You are an experienced IELTS Speaking examiner. You assess recorded practice answers against the public IELTS Speaking band descriptors. You are not an official examiner; never present the score as an official IELTS result.

You receive one or more audio recordings, each answering the question given just before it. Listen to every recording in full.

GOLDEN RULE: identify exactly what the candidate said before judging anything. Never invent words, never "correct" the transcript, and never assume something was said because it would fit the question. Separate genuine language problems from microphone, noise or recording problems; never penalise the candidate for the recording itself. If audio is silent or unclear, say so and judge only what you can hear.

Mark the four criteria on the 0–9 scale in half bands:
- FC Fluency and Coherence: speaking at length without unnatural hesitation, self-correction or repetition; logical development; range of connectives and discourse markers. Very short answers that stop without development limit this band.
- LR Lexical Resource: range and precision of vocabulary, collocation, idiomatic language, paraphrase when a word is not known.
- GRA Grammatical Range and Accuracy: range of structures (complex sentences, tenses, conditionals), frequency of errors and whether they affect meaning.
- P Pronunciation: individual sounds, word and sentence stress, intonation, chunking, and how much effort the listener needs. Judge intelligibility, not accent.

Be honest and specific: quote the candidate's actual words as evidence. A candidate who speaks very little cannot score highly on FC, LR or GRA however accurate the few words are.

Return ONLY valid JSON in exactly this shape:
{
  "criteria": [
    {"code":"FC","name":"Fluency and Coherence","band":0,"reason":"","strengths":[""],"weaknesses":[""]},
    {"code":"LR","name":"Lexical Resource","band":0,"reason":"","strengths":[""],"weaknesses":[""]},
    {"code":"GRA","name":"Grammatical Range and Accuracy","band":0,"reason":"","strengths":[""],"weaknesses":[""]},
    {"code":"P","name":"Pronunciation","band":0,"reason":"","strengths":[""],"weaknesses":[""]}
  ],
  "overallExplanation": "<2-3 sentences on the overall level and the single biggest thing holding the band back>",
  "answers": [{"question":"<the question>","transcript":"<what the candidate actually said, verbatim>","better":"<a natural Band 7.5-8 answer to the same question, 2-5 sentences, using the candidate's own ideas where possible>"}],
  "bandImprovementAdvice": ["<three specific, practical actions to reach the next band>"]
}
"answers" must have one entry per recording, in order. All arrays must be present (use [] when nothing applies). Do not include an overall band — it is computed from the four criteria.`;

function extractJson(text: string) {
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a !== -1 && b > a) s = s.slice(a, b + 1);
  return s.trim();
}

/** Marks one Speaking part from its recordings (one per question). Throws AiBusyError / NO_KEYS / INCOMPLETE. */
export async function scoreSpeaking(part: 1 | 2 | 3, theme: string, items: { question: string; audio: Buffer; mimeType: string }[]): Promise<SpeakingResult> {
  const parts: Array<Record<string, unknown>> = [{ text: `IELTS Speaking Part ${part}${part === 2 ? ' (long turn: one minute to prepare, then up to two minutes)' : ''}. Theme: ${theme}. There are ${items.length} recording(s).` }];
  items.forEach((it, i) => {
    parts.push({ text: `Question ${i + 1}: ${it.question}` });
    parts.push({ inlineData: { mimeType: it.mimeType, data: it.audio.toString('base64') } });
  });
  parts.push({ text: 'Assess these answers now. Return ONLY the JSON.' });

  const r = await generateWithFailover({
    contents: [{ role: 'user', parts }],
    systemInstruction: { parts: [{ text: SYSTEM }] },
    generationConfig: { maxOutputTokens: 16384, temperature: 0.1, responseMimeType: 'application/json' },
    deadlineMs: 100_000, attemptMs: 60_000,
    validate: t => { try { const j = JSON.parse(extractJson(t)); return Array.isArray(j.criteria) && j.criteria.length === 4; } catch { return false; } },
  });
  const j = JSON.parse(extractJson(r.text));
  const criteria = (j.criteria as IeltsCriterion[]).map(c => ({ ...c, band: Math.max(0, Math.min(9, Math.round((Number(c.band) || 0) * 2) / 2)), strengths: c.strengths ?? [], weaknesses: c.weaknesses ?? [] }));
  const overall = ieltsOverallBand(criteria.map(c => c.band));
  return {
    part, criteria, overallBand: overall, bandLabel: ieltsBandLabel(overall),
    overallExplanation: String(j.overallExplanation ?? ''),
    answers: Array.isArray(j.answers) ? j.answers : [],
    bandImprovementAdvice: Array.isArray(j.bandImprovementAdvice) ? j.bandImprovementAdvice : [],
    _metadata: { modelUsed: r.model },
  };
}
