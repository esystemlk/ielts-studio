'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wordmark } from '@/components/ui';
import { BuyButton } from '@/components/buy-button';
import { READING_MINUTES, WRITING_MINUTES, LISTENING_PART_GAP_SECONDS, type IeltsMockDef } from '@/lib/ielts-mock/mocks';
import type { IeltsMockResult, IeltsMockReview, MockReviewQuestion } from '@/lib/ielts-mock/types';
import type { IeltsEssayResult } from '@/types/ielts-essay';
import './mock.css';

/**
 * A full IELTS mock: Listening, then Reading, then Writing, run like test day.
 * Same rules as smartlabs.lk's mock (it is the same exam and the same credit): the credit is
 * spent at Start, Listening audio plays once and cannot be paused, Reading and Writing are timed
 * and submit themselves when time runs out. Marking happens on smartlabs.lk via /api/mock/*.
 */

interface Question { id: number; part?: number; passage?: number; kind: string; prompt: string; options?: string[]; choices?: { letter: string; text: string }[] }
interface Group { title?: string; instructions?: string; matchOptions?: { letter: string; text: string }[] }
interface Block { type: string; startId: number; endId: number; image?: string; alt?: string; title?: string; text?: string }
export interface ListeningData { sections: { part: number; title: string; subtitle?: string; audio: string }[]; groups: Record<string, Group>; questions: Question[]; blocks?: Block[] }
export interface ReadingData { passages: { title: string; intro?: string; paragraphs: { label?: string; text: string }[] }[]; groups: Record<string, Group>; questions: Question[]; blocks?: Block[] }
export interface WritingData { task1: { prompt: string; image: string; imageAlt: string }; task2: { prompt: string } }

type Answers = Record<number, string>;
type Phase = 'intro' | 'listening' | 'reading' | 'writing' | 'submitting' | 'result';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;
const wordsOf = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

async function api(path: string, token: string, body?: object) {
  const res = await fetch(`/api/mock/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function groupFor(groups: Record<string, Group>, id: number) {
  let chosen: number | undefined;
  for (const s of Object.keys(groups).map(Number).sort((a, b) => a - b)) if (s <= id) chosen = s;
  return chosen != null ? groups[String(chosen)] : undefined;
}
function firstOfGroups(qs: Question[], groups: Record<string, Group>) {
  const seen = new Set<Group>(), first = new Set<number>();
  for (const q of qs) { const g = groupFor(groups, q.id); if (g && !seen.has(g)) { seen.add(g); first.add(q.id); } }
  return first;
}

function GroupIntro({ group }: { group: Group }) {
  return (
    <div className="mk-group">
      {group.instructions && <p className="mk-instr">{group.instructions}</p>}
      {!!group.matchOptions?.length && <ul className="mk-options">{group.matchOptions.map(o => <li key={o.letter}><b>{o.letter}</b><span>{o.text}</span></li>)}</ul>}
    </div>
  );
}

function QuestionField({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  if (q.kind === 'unavailable') return null;
  const letters = q.options ?? [];
  return (
    <div className="mk-q">
      <span className="mk-qn">{q.id}</span>
      <div className="mk-qbody">
        {q.prompt && <p className="mk-prompt">{q.prompt}</p>}
        {q.choices?.length ? (
          <div className="mk-choices">{q.choices.map(c => (
            <label key={c.letter}><input type="radio" name={`q${q.id}`} checked={value === c.letter} onChange={() => onChange(c.letter)} /><span><b>{c.letter}</b> {c.text}</span></label>
          ))}</div>
        ) : letters.length > 0 && letters.length <= 10 ? (
          <div className="mk-letters" role="group" aria-label={`Question ${q.id} answer`}>{letters.map(l => (
            <button key={l} type="button" aria-pressed={value === l} className={value === l ? 'on' : ''} onClick={() => onChange(value === l ? '' : l)}>{l}</button>
          ))}</div>
        ) : (
          <input className="mk-input" value={value} onChange={e => onChange(e.target.value)} placeholder="Type your answer" aria-label={`Answer to question ${q.id}`} autoComplete="off" spellCheck={false} />
        )}
      </div>
    </div>
  );
}

function StaffStrip({ children }: { children: React.ReactNode }) {
  return <div className="mk-staff"><span>Staff test mode</span>{children}</div>;
}

export function MockRunner({ mock, listening, reading, writing }: { mock: IeltsMockDef; listening: ListeningData; reading: ReadingData; writing: WritingData }) {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const [phase, setPhase] = useState<Phase>('intro');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needCredits, setNeedCredits] = useState(false);
  const [starting, setStarting] = useState(false);
  const [lAns, setLAns] = useState<Answers>({});
  const [rAns, setRAns] = useState<Answers>({});
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [result, setResult] = useState<IeltsMockResult | null>(null);
  const [staff, setStaff] = useState<{ listening: Answers; reading: Answers } | null>(null);

  // Staff (admin/developer) get the answer key for quick end-to-end checks, as on smartlabs.lk.
  useEffect(() => {
    if (!user) return;
    let live = true;
    getDoc(doc(db, 'users', user.uid)).then(async s => {
      const role = s.data()?.role;
      if (role !== 'admin' && role !== 'developer') return;
      const { ok, data } = await api(`dev-answers?mockId=${mock.id}`, await user.getIdToken());
      if (live && ok) setStaff(data);
    }).catch(() => {});
    return () => { live = false; };
  }, [user, db, mock.id]);

  // Leaving mid-exam loses the attempt (the credit is already spent), so warn first.
  useEffect(() => {
    if (phase !== 'listening' && phase !== 'reading' && phase !== 'writing') return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  async function start() {
    if (!user) return;
    setStarting(true); setError(null); setNeedCredits(false);
    try {
      const { ok, data } = await api('start', await user.getIdToken(), { mockId: mock.id });
      if (!ok) {
        if (data.code === 'NO_IELTS_MOCK_CREDITS') { setNeedCredits(true); setError('You need a mock test credit to start.'); return; }
        if (data.code === 'UNAUTHENTICATED' || data.code === 'SESSION_EXPIRED') { router.push(`/login?redirect=/mocks/${mock.id}`); return; }
        throw new Error(data.error || 'Could not start the mock test.');
      }
      setAttemptId(data.attemptId);
      setPhase('listening');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start the mock test.'); }
    finally { setStarting(false); }
  }

  const submit = useCallback(async () => {
    if (!user || !attemptId) return;
    setPhase('submitting'); setError(null);
    try {
      const { ok, data } = await api('score', await user.getIdToken(), { attemptId, mockId: mock.id, listeningAnswers: lAns, readingAnswers: rAns, writingTask1: t1, writingTask2: t2 });
      if (!ok) throw new Error(data.error || 'Could not mark the mock test.');
      setResult(data as IeltsMockResult);
      setPhase('result');
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark the mock test. Your answers are kept, so try again.');
      setPhase('writing');
    }
  }, [user, attemptId, mock.id, lAns, rAns, t1, t2]);

  const steps: Phase[] = ['listening', 'reading', 'writing'];
  const order: Phase[] = ['intro', 'listening', 'reading', 'writing', 'submitting', 'result'];
  return (
    <div className="mk">
      <header className="mk-top">
        <Wordmark />
        <div className="mk-title"><small>Mock test</small><b>{mock.title}</b></div>
        <ol className="mk-steps" aria-label="Sections">
          {steps.map(s => <li key={s} className={phase === s ? 'on' : order.indexOf(s) < order.indexOf(phase) ? 'done' : ''} aria-current={phase === s ? 'step' : undefined}>{s[0].toUpperCase() + s.slice(1)}</li>)}
        </ol>
      </header>
      <div className="mk-body">
        {phase === 'intro' && <Intro mock={mock} onStart={start} starting={starting} error={error} needCredits={needCredits} />}
        {phase === 'listening' && <ListeningPhase data={listening} answers={lAns} setAnswers={setLAns} onDone={() => setPhase('reading')} staff={staff?.listening} />}
        {phase === 'reading' && <ReadingPhase data={reading} answers={rAns} setAnswers={setRAns} onDone={() => setPhase('writing')} staff={staff?.reading} />}
        {phase === 'writing' && <WritingPhase writing={writing} t1={t1} setT1={setT1} t2={t2} setT2={setT2} onSubmit={submit} error={error} staff={!!staff} />}
        {phase === 'submitting' && (
          <div className="mk-wait" role="status"><span className="mk-spin" /><h2>Marking your mock test</h2><p className="muted">Listening and Reading are marked straight away. Writing is marked by AI, which can take up to a minute.</p></div>
        )}
        {phase === 'result' && result && attemptId && <Result r={result} attemptId={attemptId} />}
      </div>
    </div>
  );
}

function Intro({ mock, onStart, starting, error, needCredits }: { mock: IeltsMockDef; onStart: () => void; starting: boolean; error: string | null; needCredits: boolean }) {
  return (
    <section className="mk-card mk-intro">
      <p className="label">Full mock test</p>
      <h1>{mock.title}</h1>
      <p className="muted">A complete timed IELTS Academic mock in three skills. Speaking is not part of this mock.</p>
      <ul className="mk-parts">
        <li><b>Listening</b><span>{mock.listening.label}. 4 parts, 40 questions. The audio plays once and cannot be paused; each part moves on {LISTENING_PART_GAP_SECONDS} seconds after its audio ends.</span></li>
        <li><b>Reading</b><span>{mock.reading.label}. 3 passages, 40 questions, {READING_MINUTES} minutes.</span></li>
        <li><b>Writing</b><span>{mock.writingLabel}. Task 1 and Task 2 in {WRITING_MINUTES} minutes, marked by AI.</span></li>
      </ul>
      <p className="mk-note"><b>Overall band = (Listening + Reading + Writing) ÷ 3.</b> Once you start, the sections run in order and the timers cannot be paused. Use headphones and a quiet room. Starting uses <b>1 mock test credit</b>.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      {needCredits ? (
        <div className="mk-buy"><BuyButton productId="mock-1" className="btn accent">Buy 1 mock · $5</BuyButton><BuyButton productId="mock-3" className="btn secondary">3 mocks · $15</BuyButton></div>
      ) : (
        <button type="button" className="btn accent block" onClick={onStart} disabled={starting}>{starting ? 'Starting…' : 'Start the mock test'}</button>
      )}
    </section>
  );
}

function ListeningPhase({ data, answers, setAnswers, onDone, staff }: { data: ListeningData; answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>>; onDone: () => void; staff?: Answers }) {
  const [partIdx, setPartIdx] = useState(0);
  const [gap, setGap] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const section = data.sections[partIdx];
  const qs = data.questions.filter(q => q.part === section.part && q.kind !== 'unavailable');
  const map = (data.blocks ?? []).find(b => b.type === 'map' && b.image && qs.some(q => q.id >= b.startId && q.id <= b.endId));
  const first = firstOfGroups(qs, data.groups);

  const advance = useCallback(() => {
    if (partIdx + 1 < data.sections.length) { setPartIdx(i => i + 1); setGap(null); window.scrollTo({ top: 0 }); } else onDone();
  }, [partIdx, data.sections.length, onDone]);

  useEffect(() => {
    if (gap == null) return;
    if (gap <= 0) { advance(); return; }
    const t = setTimeout(() => setGap(g => (g == null ? g : g - 1)), 1000);
    return () => clearTimeout(t);
  }, [gap, advance]);

  // Play each part from the start; if the student pauses (e.g. media keys), resume.
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    const resume = () => { if (el.paused && !el.ended) el.play().catch(() => {}); };
    el.addEventListener('pause', resume);
    return () => el.removeEventListener('pause', resume);
  }, [partIdx]);

  return (
    <section className="mk-narrow">
      <div className="mk-head"><h2>Listening · Part {section.part} <span className="muted">of {data.sections.length}</span></h2><span className="mk-pill">Plays once · no pause</span></div>
      {staff && <StaffStrip>
        <button type="button" onClick={() => setAnswers(a => { const n = { ...a }; for (const q of qs) if (staff[q.id] != null) n[q.id] = staff[q.id]; return n; })}>Fill this part</button>
        <button type="button" onClick={() => { setGap(null); advance(); }}>Skip audio</button>
      </StaffStrip>}
      <div className="mk-card mk-audio">
        <audio ref={audio} src={section.audio} onEnded={() => setGap(LISTENING_PART_GAP_SECONDS)} preload="auto" />
        {blocked ? (
          <button type="button" className="btn accent" onClick={() => audio.current?.play().then(() => setBlocked(false)).catch(() => {})}>Play the audio</button>
        ) : gap == null ? (
          <p className="mk-live"><span className="mk-dot" />Audio playing. Answer as you listen.{section.subtitle && <span className="muted"> · {section.subtitle}</span>}</p>
        ) : (
          <p className="mk-live accent">Next part in {gap}s…</p>
        )}
      </div>
      {map && <div className="mk-card mk-figure">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={map.image} alt={map.alt || 'Map for this part'} /></div>}
      <div className="mk-card">
        {qs.map(q => <div key={q.id}>{first.has(q.id) && <GroupIntro group={groupFor(data.groups, q.id)!} />}<QuestionField q={q} value={answers[q.id] ?? ''} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} /></div>)}
      </div>
      <p className="mk-hint">The next part opens by itself when this part&apos;s audio ends. You cannot go back to an earlier part.</p>
    </section>
  );
}

function useCountdown(seconds: number, onEnd: () => void) {
  const [left, setLeft] = useState(seconds);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    const iv = setInterval(() => setLeft(s => { if (s <= 1) { clearInterval(iv); end.current(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(iv);
  }, []);
  return left;
}

function ReadingPhase({ data, answers, setAnswers, onDone, staff }: { data: ReadingData; answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>>; onDone: () => void; staff?: Answers }) {
  const left = useCountdown(READING_MINUTES * 60, onDone);
  const [p, setP] = useState(0);
  const passage = data.passages[p];
  const qs = data.questions.filter(q => q.passage === p && q.kind !== 'unavailable');
  const first = firstOfGroups(qs, data.groups);
  const answered = Object.values(answers).filter(v => v.trim()).length;
  return (
    <section>
      <div className="mk-head sticky"><h2>Reading · Passage {p + 1} <span className="muted">of {data.passages.length}</span></h2><span className={`mk-timer${left <= 300 ? ' low' : ''}`} role="timer">{fmt(left)}</span></div>
      {staff && <StaffStrip><button type="button" onClick={() => setAnswers(a => ({ ...a, ...staff }))}>Fill all answers</button><button type="button" onClick={onDone}>Skip to Writing</button></StaffStrip>}
      <div className="mk-tabs" role="tablist">{data.passages.map((_, i) => <button key={i} role="tab" aria-selected={i === p} className={i === p ? 'on' : ''} onClick={() => setP(i)}>Passage {i + 1}</button>)}</div>
      <div className="mk-split">
        <article className="mk-card mk-passage">
          <h3>{passage.title}</h3>
          {passage.intro && <p className="mk-intro-text">{passage.intro}</p>}
          {passage.paragraphs.map((para, i) => <p key={i}>{para.label && <b>{para.label} </b>}{para.text}</p>)}
          {(data.blocks ?? []).filter(b => b.type !== 'summary' && b.image && qs.some(q => q.id >= b.startId && q.id <= b.endId)).map(b => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={b.startId} className="mk-diagram" src={b.image} alt={b.alt || 'Diagram'} />
          ))}
        </article>
        <div className="mk-card mk-questions">
          {qs.map(q => (
            <div key={q.id}>
              {first.has(q.id) && <GroupIntro group={groupFor(data.groups, q.id)!} />}
              {data.blocks?.filter(b => b.type === 'summary' && b.startId === q.id).map(b => (
                <div key={b.startId} className="mk-summary">{b.title && <b>{b.title}</b>}<p>{b.text?.replace(/\{(\d+)\}/g, '[$1] ________')}</p></div>
              ))}
              <QuestionField q={q} value={answers[q.id] ?? ''} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />
            </div>
          ))}
        </div>
      </div>
      <div className="mk-foot"><span className="muted">{answered} of 40 answered</span><button type="button" className="btn accent" onClick={() => { if (confirm('Finish Reading and go to Writing? You cannot come back to Reading.')) onDone(); }}>Finish Reading</button></div>
    </section>
  );
}

const SAMPLE_T1 = 'The chart shows how the figures changed over the period. Overall, one category rose steadily while the others fell or stayed broadly stable. The highest values were in the first category, which increased markedly, whereas the lowest remained level throughout. At the start the values were similar, but by the end the gap between the largest and smallest had widened considerably.';
const SAMPLE_T2 = 'Some people support this view, while others disagree. This essay looks at both sides before giving my opinion. On the one hand, supporters argue that the benefits are large and meet a real need. On the other hand, critics say the drawbacks are often underestimated. In my view, a balanced approach works best, because the advantages only appear with sensible rules in place. In conclusion, both sides have merit, but on balance the benefits are greater.';

function WritingPhase({ writing, t1, setT1, t2, setT2, onSubmit, error, staff }: { writing: WritingData; t1: string; setT1: (s: string) => void; t2: string; setT2: (s: string) => void; onSubmit: () => void; error: string | null; staff: boolean }) {
  const left = useCountdown(WRITING_MINUTES * 60, onSubmit);
  const [tab, setTab] = useState<'t1' | 't2'>('t1');
  const ready = t1.trim() && t2.trim();
  return (
    <section className="mk-narrow wide">
      <div className="mk-head sticky"><h2>Writing</h2><span className={`mk-timer${left <= 300 ? ' low' : ''}`} role="timer">{fmt(left)}</span></div>
      {staff && <StaffStrip><button type="button" onClick={() => { setT1(SAMPLE_T1); setT2(SAMPLE_T2); }}>Fill sample answers</button></StaffStrip>}
      <div className="mk-tasks" role="tablist">
        {([['t1', 'Task 1 · Report', wordsOf(t1), 150], ['t2', 'Task 2 · Essay', wordsOf(t2), 250]] as const).map(([id, label, w, min]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}><b>{label}</b><small className={w >= min ? 'ok' : ''}>{w} words · aim for {min}+</small></button>
        ))}
      </div>
      <div className="mk-write">
        <div className="mk-card mk-task">
          <p className="label">{tab === 't1' ? 'Writing Task 1 · about 20 minutes' : 'Writing Task 2 · about 40 minutes'}</p>
          <p className="mk-prompt">{tab === 't1' ? writing.task1.prompt : writing.task2.prompt}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {tab === 't1' && <img className="mk-diagram" src={writing.task1.image} alt={writing.task1.imageAlt} />}
        </div>
        <textarea className="mk-textarea" value={tab === 't1' ? t1 : t2} onChange={e => (tab === 't1' ? setT1 : setT2)(e.target.value)} aria-label={tab === 't1' ? 'Your Task 1 answer' : 'Your Task 2 answer'}
          placeholder={tab === 't1' ? 'Describe the main features and make comparisons…' : 'Write your essay…'} spellCheck={false} />
      </div>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button type="button" className="btn accent block" disabled={!ready} onClick={onSubmit}>Submit and get my band</button>
      <p className="mk-hint">{ready ? 'Both tasks have an answer. Submitting ends the mock test.' : 'Write something for both tasks to submit. When time runs out, the mock is submitted as it is.'}</p>
    </section>
  );
}

function EssayFeedback({ r, question, response }: { r: IeltsEssayResult; question?: string; response?: string }) {
  return (
    <div className="mk-feedback">
      {response && <details className="mk-card"><summary>Question and your answer</summary>{question && <p className="mk-prompt">{question}</p>}<p className="mk-response">{response}</p></details>}
      <div className="mk-criteria">{r.criteria.map(c => (
        <div key={c.code} className="mk-card mk-crit">
          <div className="mk-crit-head"><b>{c.name}</b><span className="num">{c.band}</span></div>
          <p>{c.reason}</p>
          {!!c.strengths?.length && <><p className="mini">What went well</p><ul>{c.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></>}
          {!!c.weaknesses?.length && <><p className="mini">What to fix</p><ul>{c.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></>}
        </div>
      ))}</div>
      {!!r.bandImprovementAdvice?.length && <div className="mk-card"><p className="label">To reach the next band</p><ol>{r.bandImprovementAdvice.map((a, i) => <li key={i}>{a}</li>)}</ol></div>}
    </div>
  );
}

function Review({ attemptId }: { attemptId: string }) {
  const { user } = useUser();
  const [review, setReview] = useState<IeltsMockReview | null>(null);
  const [skill, setSkill] = useState<'listening' | 'reading'>('listening');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    if (!user) return;
    setBusy(true); setError('');
    const { ok, data } = await api(`review?attemptId=${encodeURIComponent(attemptId)}`, await user.getIdToken());
    setBusy(false);
    if (ok) setReview(data); else setError(data.error || 'Could not load your answers.');
  }
  const label = (q: MockReviewQuestion, v: string) => { const t = q.options?.find(o => o.letter === v.trim().toUpperCase())?.text; return t ? `${v} (${t})` : v; };
  return (
    <section className="mk-card">
      <div className="mk-head"><h3>Listening and Reading answers</h3>{!review && <button type="button" className="btn secondary small" onClick={load} disabled={busy}>{busy ? 'Loading…' : 'Review my answers'}</button>}</div>
      {error && <p role="alert" className="form-error">{error}</p>}
      {review && <>
        <div className="mk-tabs" role="tablist">{(['listening', 'reading'] as const).map(s => <button key={s} role="tab" aria-selected={skill === s} className={skill === s ? 'on' : ''} onClick={() => setSkill(s)}>{s === 'listening' ? 'Listening' : 'Reading'}</button>)}</div>
        <ul className="mk-review">{(review[skill] ?? []).map(q => (
          <li key={q.id} className={q.correct ? 'right' : 'wrong'}>
            <span className="mk-qn">{q.id}</span>
            <div><p>{q.prompt || `Gap ${q.id}`}</p><p className="muted">Your answer: <b>{q.given.trim() ? label(q, q.given) : 'No answer'}</b>{!q.correct && <> · Correct: <b>{q.accepted.map(a => label(q, a)).join(' / ')}</b></>}</p></div>
            <span className="mk-mark">{q.correct ? '✓' : '✗'}</span>
          </li>
        ))}</ul>
      </>}
    </section>
  );
}

function Result({ r, attemptId }: { r: IeltsMockResult; attemptId: string }) {
  const [open, setOpen] = useState<'t1' | 't2'>('t2');
  return (
    <div className="mk-narrow wide mk-result">
      <section className="mk-card mk-overall">
        <p className="label">Overall band</p>
        <p className="mk-big num">{r.overall}</p>
        <p className="mk-band-label">{r.overallLabel}</p>
        <p className="muted">(Listening {r.listening.band} + Reading {r.reading.band} + Writing {r.writing.band}) ÷ 3{r.emailStatus?.sent ? ' · A copy with a PDF report has been emailed to you.' : ''}</p>
      </section>
      <div className="mk-bands">
        {[['Listening', r.listening.band, `${r.listening.raw}/${r.listening.total} correct`], ['Reading', r.reading.band, `${r.reading.raw}/${r.reading.total} correct`], ['Writing', r.writing.band, `Task 1: ${r.writing.task1Band} · Task 2: ${r.writing.task2Band}`]].map(([n, b, s]) => (
          <div key={n as string} className="mk-card"><span className="mk-ring num">{b}</span><b>{n}</b><small>{s}</small></div>
        ))}
      </div>
      <section>
        <div className="mk-head"><h3>Writing feedback</h3></div>
        <div className="mk-tabs" role="tablist">
          <button role="tab" aria-selected={open === 't1'} className={open === 't1' ? 'on' : ''} onClick={() => setOpen('t1')}>Task 1 · Band {r.writing.task1Band}</button>
          <button role="tab" aria-selected={open === 't2'} className={open === 't2' ? 'on' : ''} onClick={() => setOpen('t2')}>Task 2 · Band {r.writing.task2Band}</button>
        </div>
        {open === 't1' ? <EssayFeedback r={r.writing.task1} question={r.writing.task1Question} response={r.writing.task1Response} /> : <EssayFeedback r={r.writing.task2} question={r.writing.task2Question} response={r.writing.task2Response} />}
      </section>
      <Review attemptId={attemptId} />
      <p className="mk-actions"><Link className="btn accent" href="/mocks">More mock tests</Link><Link className="btn secondary" href="/dashboard">Dashboard</Link></p>
      <p className="mk-hint">Estimated bands for practice. This is not an official IELTS result.</p>
    </div>
  );
}
