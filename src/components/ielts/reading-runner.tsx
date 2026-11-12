'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@/firebase';
import { ArrowLeft, CheckCircle2, Clock3, Flag } from 'lucide-react';
import './reading-test.css';
import './reading-runner.css';

type Choice = { letter: string; text: string };
type Question = { id: number; passage: number; kind: 'text' | 'choice' | 'unavailable'; prompt?: string; options?: string[]; choices?: Choice[]; wordLimit?: number };
type Paragraph = { ref?: string; text: string };
type Passage = { title: string; intro?: string; paragraphs: Paragraph[] };
type Block =
  | { type: 'diagram'; startId: number; endId: number; image: string; alt: string; caption?: string }
  | { type: 'summary'; startId: number; endId: number; title?: string; text: string };
export type TestData = {
  id: string; title: string; version: number; endpoint: string;
  passages: Passage[]; groups: Record<string, { title: string; instructions: string }>;
  blocks?: Block[]; questions: Question[];
};
type Answers = Record<string, string>;
type Review = { score: number; total: number; results: { id: number; answer: string; accepted: string[]; correct: boolean }[] };

// Render a completion prompt, turning each "…" gap into a clearly marked blank
// so students see where the answer they type below belongs.
function gapify(text?: string) {
  if (!text || !text.includes('…')) return text;
  return text.split('…').flatMap((part, i) =>
    i === 0 ? [part] : [<span className="reading-gap" key={i} aria-label="blank — type your answer in the box below">______</span>, part]);
}

export function ReadingRunner({ data }: { data: TestData }) {
  const { user } = useUser();
  const storageKey = `ielts-reading:${user?.uid ?? 'guest'}:${data.id}:v${data.version}`;
  const [answers, setAnswers] = useState<Answers>({});
  const [passage, setPassage] = useState(0);
  const [flags, setFlags] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [loaded, setLoaded] = useState('');
  const [explanations, setExplanations] = useState<Record<number, { loading?: boolean; text?: string; error?: string }>>({});
  const started = useRef(0);
  const elapsedBase = useRef(0);

  async function requestExplain(id: number) {
    const q = data.questions.find(x => x.id === id);
    const r = review?.results.find(x => x.id === id);
    if (!q || !r) return;
    if (!user) { setExplanations(e => ({ ...e, [id]: { error: 'Please sign in to see explanations.' } })); return; }
    setExplanations(e => ({ ...e, [id]: { loading: true } }));
    try {
      const passage = data.passages[q.passage];
      const passageText = `${passage.title}\n${passage.intro ?? ''}\n${passage.paragraphs.map(p => (p.ref ? p.ref + ' ' : '') + p.text).join('\n')}`;
      const idToken = await user.getIdToken();
      const res = await fetch('/api/ielts-reading/explain', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ testId: data.id, questionId: id, passage: passageText, question: q.prompt || '', accepted: r.accepted, number: id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not explain.');
      setExplanations(e => ({ ...e, [id]: { text: d.explanation } }));
    } catch (err) {
      setExplanations(e => ({ ...e, [id]: { error: err instanceof Error ? err.message : 'Could not explain.' } }));
    }
  }

  const total = data.questions.filter(q => q.kind !== 'unavailable').length;
  const blockByStart = useMemo(() => { const m: Record<number, Block> = {}; (data.blocks ?? []).forEach(b => { m[b.startId] = b; }); return m; }, [data.blocks]);
  const blockIds = useMemo(() => { const s = new Set<number>(); (data.blocks ?? []).forEach(b => { for (let i = b.startId; i <= b.endId; i++) s.add(i); }); return s; }, [data.blocks]);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      setAnswers({}); setFlags([]); setSeconds(0); setPassage(0); setReview(null); setRunning(false);
      let restoredSeconds = 0;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (saved) {
          if (saved.answers && typeof saved.answers === 'object') setAnswers(Object.fromEntries(Object.entries(saved.answers).filter(([key, value]) => /^([1-9]|[1-3][0-9]|40)$/.test(key) && typeof value === 'string' && value.length <= 200)) as Answers);
          if (Array.isArray(saved.flags)) setFlags(saved.flags.filter((n: unknown) => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 40));
          if (Number.isFinite(saved.seconds)) { restoredSeconds = Math.max(0, saved.seconds); setSeconds(restoredSeconds); }
          if ([0, 1, 2].includes(saved.passage)) setPassage(saved.passage);
        }
      } catch { setSaveStatus('Device storage is unavailable. Keep this page open to retain your answers.'); }
      // Start the timer automatically as soon as the test loads.
      elapsedBase.current = restoredSeconds; started.current = Date.now(); setRunning(true);
      setLoaded(storageKey);
    }, 0);
    return () => window.clearTimeout(restore);
  }, [storageKey]);

  useEffect(() => {
    if (loaded !== storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ answers, flags, seconds, passage })); } catch { return; }
  }, [answers, flags, seconds, passage, loaded, storageKey]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds(elapsedBase.current + Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const answered = data.questions.filter(q => q.kind !== 'unavailable' && answers[q.id]?.trim()).length;
  function toggleTimer() {
    if (running) setRunning(false);
    else { elapsedBase.current = seconds; started.current = Date.now(); setRunning(true); }
  }

  function input(id: number) {
    const q = data.questions.find(q => q.id === id)!;
    const result = review?.results.find(r => r.id === id);
    return <div className="reading-answer">
      <label className="sr-only" htmlFor={`answer-${id}`}>Answer {id}</label>
      {q.kind === 'choice'
        ? <select id={`answer-${id}`} value={answers[id] || ''} disabled={!!review || busy} onChange={e => setAnswers(a => ({ ...a, [id]: e.target.value }))}><option value="">Choose</option>{q.options!.map(o => <option key={o} value={o}>{o}</option>)}</select>
        : <input id={`answer-${id}`} autoComplete="off" spellCheck={false} maxLength={200} value={answers[id] || ''} disabled={!!review || busy} placeholder={`${q.wordLimit} word${q.wordLimit === 1 ? '' : 's'} max`} onChange={e => setAnswers(a => ({ ...a, [id]: e.target.value }))} />}
      {result && <p className={result.correct ? 'reading-correct' : 'reading-incorrect'}>{result.correct ? 'Correct' : `Accepted: ${result.accepted.join(' / ')}`} · Your answer: {result.answer || 'Unanswered'}</p>}
      {result && (() => {
        const ex = explanations[id];
        return <div className="reading-explain">
          {!ex && <button type="button" className="reading-explain-btn" onClick={() => requestExplain(id)}>Explain this answer</button>}
          {ex?.loading && <p className="reading-explain-loading">Explaining…</p>}
          {ex?.error && <p className="reading-explain-error">{ex.error}</p>}
          {ex?.text && <div className="reading-explain-box"><strong>How to get it</strong><p>{ex.text}</p></div>}
        </div>;
      })()}
    </div>;
  }

  function summaryBody(text: string) {
    return text.split(/(\{\d+\})/).map((piece, i) => /^\{\d+\}$/.test(piece)
      ? <span className="reading-summary-blank" key={i} id={`question-${piece.slice(1, -1)}`}><strong>{piece.slice(1, -1)}</strong>{input(Number(piece.slice(1, -1)))}</span>
      : <span key={i}>{piece}</span>);
  }

  function normalQuestion(q: Question) {
    return <div className="reading-question" id={`question-${q.id}`} key={q.id}>
      <div className="reading-question-label">
        <label htmlFor={`answer-${q.id}`}><b>{q.id}</b> {gapify(q.prompt)}</label>
        <button title={`Flag question ${q.id} for review`} aria-label={`Flag question ${q.id} for review`} aria-pressed={flags.includes(q.id)} onClick={() => setFlags(f => f.includes(q.id) ? f.filter(n => n !== q.id) : [...f, q.id])}><Flag size={16} /></button>
      </div>
      {q.choices && <ul className="reading-choices">{q.choices.map(c => <li key={c.letter}><b>{c.letter}</b> {c.text}</li>)}</ul>}
      {input(q.id)}
    </div>;
  }

  function diagramBlock(block: Extract<Block, { type: 'diagram' }>) {
    const ids: number[] = []; for (let i = block.startId; i <= block.endId; i++) ids.push(i);
    return <div className="reading-diagram" key={`diagram-${block.startId}`}>
      <a href={block.image} target="_blank" rel="noreferrer"><Image src={block.image} alt={block.alt} width={956} height={1024} /><span>Open full-size diagram</span></a>
      {block.caption && <p className="reading-diagram-caption">{block.caption}</p>}
      <div className="reading-diagram-labels">{ids.map(id => { const q = data.questions.find(x => x.id === id)!; return <div className="reading-diagram-label" id={`question-${id}`} key={id}><label htmlFor={`answer-${id}`}><b>{id}</b> {gapify(q.prompt)}</label>{input(id)}</div>; })}</div>
    </div>;
  }

  function summaryBlock(block: Extract<Block, { type: 'summary' }>) {
    return <div className="reading-summary" key={`summary-${block.startId}`} id={`question-${block.startId}`}>
      {block.title && <h4>{block.title}</h4>}
      <p>{summaryBody(block.text)}</p>
    </div>;
  }

  async function submit() {
    setBusy(true); setError(''); setRunning(false);
    try {
      const response = await fetch(data.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not mark your answers.');
      setReview(result); setConfirm(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again. Your answers are still here.'); }
    finally { setBusy(false); }
  }

  function navigateQuestion(id: number) {
    const q = data.questions.find(item => item.id === id)!;
    setPassage(q.passage);
    window.setTimeout(() => document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'auto', block: 'center' }), 0);
  }

  return <div className="reading-test">
    <Link href="/practice/reading" className="reading-back"><ArrowLeft size={16} /> Reading collection</Link>
    <header className="reading-title"><p className="studio-eyebrow">ACADEMIC READING · GUIDED PRACTICE</p><h1>{data.title}</h1><p>Three passages · {total} questions · answers saved on this device</p></header>
    <div className="reading-toolbar"><span><CheckCircle2 size={17} /> {answered} / {total} answered</span><span><Clock3 size={17} /> {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')} elapsed</span><button disabled={!!review} onClick={toggleTimer}>{running ? 'Pause timer' : 'Start timer'}</button><span>{saveStatus || 'Answers saved on this device'}</span></div>
    {review && <section className="reading-results" role="status"><h2>{review.score} / {review.total} correct</h2><p>Marked against the supplied answer key. This is a practice raw score, not an official IELTS band score.</p><button onClick={() => { setReview(null); setConfirm(false); }}>Edit answers and try again</button></section>}
    <nav className="reading-tabs" aria-label="Reading passages">{data.passages.map((p, i) => <button key={p.title} aria-pressed={passage === i} onClick={() => setPassage(i)}>Passage {i + 1}<small>{p.title}</small></button>)}</nav>
    <div className="reading-workspace">
      <article className="reading-passage" key={passage}>
        <p className="studio-eyebrow">READING PASSAGE {passage + 1}</p>
        <h2>{data.passages[passage].title}</h2>
        {data.passages[passage].intro && <p><em>{data.passages[passage].intro}</em></p>}
        {data.passages[passage].paragraphs.map((p, i) => <p key={i}>{p.ref && <b className="reading-para-ref">{p.ref}</b>}{p.text}</p>)}
      </article>
      <section className="reading-questions" aria-label="Questions">{data.questions.filter(q => q.passage === passage).map(q => {
        if (blockIds.has(q.id) && !blockByStart[q.id]) return null; // covered by a block, not its start
        const header = data.groups[q.id] ? <header className="reading-group" key={`g-${q.id}`}><h3>{data.groups[q.id].title}</h3><p>{data.groups[q.id].instructions}</p></header> : null;
        const block = blockByStart[q.id];
        const body = block ? (block.type === 'diagram' ? diagramBlock(block) : summaryBlock(block)) : normalQuestion(q);
        return <div key={q.id}>{header}{body}</div>;
      })}</section>
    </div>
    <nav className="reading-question-nav" aria-label="Question navigation">{data.questions.map(q => <button key={q.id} disabled={q.kind === 'unavailable'} title={`Question ${q.id}`} aria-label={`Question ${q.id}${flags.includes(q.id) ? ', flagged' : ''}`} className={`${answers[q.id]?.trim() ? 'is-answered' : ''} ${flags.includes(q.id) ? 'is-flagged' : ''}`} onClick={() => navigateQuestion(q.id)}>{q.id}</button>)}</nav>
    <div className="reading-submit">{!review && !confirm && <button className="studio-primary" onClick={() => setConfirm(true)}>Review and submit answers</button>}{confirm && !review && <section aria-label="Confirm submission"><p>{answered} answered · {total - answered} unanswered. Submit all {total} questions for marking?</p><button className="studio-primary" disabled={busy} onClick={submit}>{busy ? 'Marking…' : 'Submit for marking'}</button><button disabled={busy} onClick={() => setConfirm(false)}>Keep practising</button></section>}{error && <p role="alert">{error}</p>}</div>
    <p className="reading-source">Content and answer key transcribed from the owner-supplied material. {data.title}.</p>
  </div>;
}
