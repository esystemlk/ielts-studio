// Gemini REST caller with key + model failover inside a time budget. Adapted from smartlabs.lk's
// gemini-fetch.ts (same keys GOOGLE_GENAI_API_KEY_1..5, same model order), minus the mock-key context.

const MODELS = [
  { name: 'gemini-flash-latest', api: 'v1beta' },
  { name: 'gemini-2.5-flash', api: 'v1beta' },
  { name: 'gemini-2.5-pro', api: 'v1beta' },
  { name: 'gemini-2.0-flash', api: 'v1beta' },
] as const;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const isRateLimit = (status: number, msg: string) => status === 429 || /quota|rate limit|resource_exhausted/i.test(msg);
const isTransient = (status: number, msg: string) => [500, 502, 503, 504].includes(status) || /overload|high demand|timeout|internal|unavailable|temporar/i.test(msg);

let rot = 0;
function keys(): string[] {
  // Values were copied between Vercel projects once and came out mangled, so strip stray quotes/spaces.
  const clean = (v?: string) => (v ?? '').trim().replace(/^["']|["']$/g, '');
  const present = [1, 4, 2, 3, 5].map(i => clean(process.env[`GOOGLE_GENAI_API_KEY_${i}`])).filter(Boolean);
  const start = present.length ? rot++ % present.length : 0; // spread load across keys
  const ordered = [...present.slice(start), ...present.slice(0, start)];
  const fallback = clean(process.env.GEMINI_API_KEY);
  return fallback && !ordered.includes(fallback) ? [...ordered, fallback] : ordered;
}

export class AiBusyError extends Error { constructor() { super('AI_BUSY'); this.name = 'AiBusyError'; } }

export async function generateWithFailover(opts: {
  contents: unknown; systemInstruction?: unknown; generationConfig?: Record<string, unknown>;
  deadlineMs?: number; attemptMs?: number; validate?: (text: string) => boolean;
}): Promise<{ text: string; model: string }> {
  const { contents, systemInstruction, generationConfig, deadlineMs = 55_000, attemptMs = deadlineMs, validate } = opts;
  const deadline = Date.now() + deadlineMs;
  const ks = keys();
  if (!ks.length) throw new Error('NO_KEYS');
  const body = JSON.stringify({ contents, ...(systemInstruction ? { systemInstruction } : {}), ...(generationConfig ? { generationConfig } : {}) });
  for (const key of ks) {
    for (const { name: model, api } of MODELS) {
      if (Date.now() > deadline) throw new AiBusyError();
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/${api}/models/${model}:generateContent?key=${key}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
          signal: AbortSignal.timeout(Math.max(1, Math.min(attemptMs, deadline - Date.now()))),
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try { msg = JSON.parse(await res.text())?.error?.message || msg; } catch { /* ignore */ }
          if (isRateLimit(res.status, msg) || isTransient(res.status, msg)) break; // next key
          continue; // e.g. model not available on this key: next model
        }
        const data = await res.json();
        const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
        if (text && (!validate || validate(text))) return { text, model };
      } catch { break; }
    }
    if (Date.now() < deadline) await sleep(150);
  }
  throw new AiBusyError();
}
