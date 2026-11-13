import { ieltsBandLabel, ieltsOverallBand, type IeltsEssayResult } from '@/types/ielts-essay';
import { generateWithFailover } from './gemini.server';
import { TASK1_SYSTEM, TASK2_SYSTEM } from './prompts';
import type { IeltsWritingTest } from '@/lib/ielts-writing/cambridge-21';

/** Marks one Writing task like smartlabs.lk does (same prompts, same band maths). Throws AiBusyError / NO_KEYS. */

function extractJson(text: string) {
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a !== -1 && b > a) s = s.slice(a, b + 1);
  return s.trim();
}

const targetBlock = (targetBand: number | undefined, what: string) => typeof targetBand === 'number'
  ? `\n\nTARGET BAND ANALYSIS — the student is aiming for Band ${targetBand}. Add a "targetBandAnalysis" object:
{
  "achieved": false,
  "gap": 0,
  "primaryReasons": ["<why the ${what} does NOT yet reach Band ${targetBand}, referencing actual criterion bands>"],
  "criteriaGaps": [{"criterion": "<name>", "currentBand": <band>, "targetApprox": <band needed>, "whatToDo": "<specific action>"}],
  "studyPriority": "<single most important focus to reach Band ${targetBand}>",
  "realisticTimeline": "<honest estimate of weeks of focused practice>"
}
The "achieved" and "gap" fields are corrected server-side — focus on accurate reasons and advice.`
  : `\n\nNo target band set. Set "targetBandAnalysis" to null.`;

/** Task 1 chart image, fetched from this site (public files are not on the server's disk on Vercel). */
async function taskImage(origin: string, publicPath: string) {
  const res = await fetch(new URL(publicPath, origin));
  if (!res.ok) throw new Error(`image ${res.status}`);
  return { data: Buffer.from(await res.arrayBuffer()).toString('base64'), mimeType: res.headers.get('content-type') || 'image/png' };
}

export async function scoreWriting(origin: string, test: IeltsWritingTest, task: 1 | 2, response: string, targetBand?: number): Promise<IeltsEssayResult> {
  const words = response.trim().split(/\s+/).filter(Boolean).length;
  const parts: Array<Record<string, unknown>> = [];
  if (task === 1) {
    const t = test.task1;
    let msg = `IELTS Academic Writing Task 1 prompt:\n${t.prompt}\n\nVisual type: ${t.visualType}`;
    if (t.keyFeatures) msg += `\n\nKEY FEATURES the visual actually shows (marking anchor — judge the student's accuracy against these):\n${t.keyFeatures}`;
    msg += `\n\nStudent response (${words} words):\n${response}\n\nStudy the attached image and evaluate this response strictly using the four IELTS Task 1 criteria. Return ONLY valid JSON in the required shape.`;
    parts.push({ text: msg + targetBlock(targetBand, 'response') });
    try { parts.push({ inlineData: await taskImage(origin, t.image) }); } catch { /* mark from the key features alone */ }
  } else {
    parts.push({ text: `IELTS Writing Task 2 question:\n${test.task2.prompt}\n\nStudent essay (${words} words):\n${response}\n\nEvaluate this essay strictly using the four IELTS criteria. Return ONLY valid JSON in the required shape.` + targetBlock(targetBand, 'essay') });
  }

  const r = await generateWithFailover({
    contents: [{ role: 'user', parts }],
    systemInstruction: { parts: [{ text: task === 1 ? TASK1_SYSTEM : TASK2_SYSTEM }] },
    generationConfig: { maxOutputTokens: 32768, temperature: 0.1 },
    deadlineMs: 100_000, attemptMs: 45_000,
    validate: t => { try { JSON.parse(extractJson(t)); return true; } catch { return false; } },
  });
  const parsed = JSON.parse(extractJson(r.text)) as IeltsEssayResult;
  if (!Array.isArray(parsed.criteria) || !parsed.criteria.length) throw new Error('INCOMPLETE');
  // Overall band is computed here from the four criteria, never taken from the model.
  const overall = ieltsOverallBand(parsed.criteria.map(c => Number(c.band) || 0));
  parsed.overallBand = overall;
  parsed.bandLabel = ieltsBandLabel(overall);
  if (typeof targetBand === 'number' && parsed.targetBandAnalysis) {
    parsed.targetBandAnalysis.achieved = overall >= targetBand;
    parsed.targetBandAnalysis.gap = Math.max(0, Math.round((targetBand - overall) * 2) / 2);
  }
  parsed._metadata = { modelUsed: r.model };
  return parsed;
}
