'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@/firebase';
import { ArrowLeft, CheckCircle2, Clock3, Flag, Headphones } from 'lucide-react';
import './reading-test.css';
import './reading-runner.css';
import './listening-runner.css';

type Choice = { letter: string; text: string };
type Question = { id: number; part: number; kind: 'text' | 'choice' | 'unavailable'; prompt?: string; options?: string[]; choices?: Choice[]; wordLimit?: number };
type Section = { part: number; title: string; subtitle?: string; audio: string };
type Group = { title: string; instructions: string; matchOptions?: Choice[] };
type Block =
  | { type: 'map'; startId: number; endId: number; image: string; alt: string; caption?: string }
  | { type: 'summary'; startId: number; endId: number; title?: string; text: string };
type TestData = {
  id: string; title: string; version: number; endpoint: string;
  sections: Section[]; groups: Record<string, Group>;
  blocks?: Block[]; questions: Question[];
};
type Answers = Record<string, string>;
type Review = { score: number; total: number; results: { id: number; answer: string; accepted: string[]; correct: boolean }[] };

// Turn each "…" gap in a completion prompt into a clearly marked blank.
function gapify(text?: string) {
  if (!text || !text.includes('…')) return text;
  return text.split('…').flatMap((part, i) =>
    i === 0 ? [part] : [<span className="reading-gap" key={i} aria-label="blank — type your answer in the box below">______</span>, part]);
}

export function ListeningRunner({ data }: { data: TestData }) {
  const { user } = useUser();
  const storageKey = `ielts-listening:${user?.uid ?? 'guest'}:${data.id}:v${data.version}`;
  const [answers, setAnswers] = useState<Answers>({});
  const [part, setPart] = useState(1);
  const [flags, setFlags] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [loaded, setLoaded] = useState('');
  const [picked, setPicked] = useState<string | null>(null); // a tapped matching option, waiting to be placed
  const started = useRef(0);
  const elapsedBase = useRef(0);

  const total = data.questions.filter(q => q.kind !== 'unavailable').length;
  const blockByStart = useMemo(() => { const m: Record<number, Block> = {}; (data.blocks ?? []).forEach(b => { m[b.startId] = b; }); return m; }, [data.blocks]);
  const blockIds = useMemo(() => { const s = new Set<number>(); (data.blocks ?? []).forEach(b => { for (let i = b.startId; i <= b.endId; i++) s.add(i); }); return s; }, [data.blocks]);
  // Matching groups (a box of lettered options assigned to each item) rendered as drag-and-drop.
  const matchGroups = useMemo(() => {
    const starts = Object.keys(data.groups).map(Number).sort((a, b) => a - b);
    const byStart: Record<number, { options: Choice[]; memberIds: number[] }> = {};
    const consumed = new Set<number>();
    starts.forEach((start, i) => {
      const g = data.groups[start];
      if (!g.matchOptions || g.matchOptions.length === 0) return;
      const next = starts[i + 1] ?? Infinity;
      const memberIds = data.questions.filter(q => q.id >= start && q.id < next && q.kind !== 'unavailable').map(q => q.id);
      byStart[start] = { options: g.matchOptions, memberIds };
      memberIds.forEach(id => consumed.add(id));
    });
    return { byStart, consumed };
  }, [data.groups, data.questions]);
  const section = data.sections.find(s => s.part === part) ?? data.sections[0];

  useEffect(() => {
    const restore = window.setTimeout(() => {
      setAnswers({}); setFlags([]); setSeconds(0); setPart(1); setReview(null); setRunning(false);
      let restoredSeconds = 0;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (saved) {
          if (saved.answers && typeof saved.answers === 'object') setAnswers(Object.fromEntries(Object.entries(saved.answers).filter(([key, value]) => /^([1-9]|[1-3][0-9]|40)$/.test(key) && typeof value === 'string' && value.length <= 200)) as Answers);
          if (Array.isArray(saved.flags)) setFlags(saved.flags.filter((n: unknown) => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 40));
          if (Number.isFinite(saved.seconds)) { restoredSeconds = Math.max(0, saved.seconds); setSeconds(restoredSeconds); }
          if ([1, 2, 3, 4].includes(saved.part)) setPart(saved.part);
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
    try { localStorage.setItem(storageKey, JSON.stringify({ answers, flags, seconds, part })); } catch { return; }
  }, [answers, flags, seconds, part, loaded, storageKey]);

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
    </div>;
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

  // Map / plan labelling: image + a row of tap-able letter buttons per question.
  function mapBlock(block: Extract<Block, { type: 'map' }>) {
    const ids: number[] = []; for (let i = block.startId; i <= block.endId; i++) ids.push(i);
    return <div className="reading-diagram" key={`map-${block.startId}`}>
      <a href={block.image} target="_blank" rel="noreferrer"><Image src={block.image} alt={block.alt} width={900} height={1024} /><span>Open full-size map</span></a>
      {block.caption && <p className="reading-diagram-caption">{block.caption}</p>}
      <div className="map-rows">{ids.map(id => {
        const q = data.questions.find(x => x.id === id)!;
        const sel = answers[id];
        const result = review?.results.find(r => r.id === id);
        return <div className="map-row" id={`question-${id}`} key={id}>
          <div className="map-row-label"><b>{id}</b> {gapify(q.prompt)}</div>
          <div className="map-letters" role="group" aria-label={`Answer ${id}`}>{(q.options ?? []).map(o => {
            const isSel = sel === o;
            const tone = result ? (result.accepted.includes(o) ? 'is-correct-letter' : isSel ? 'is-wrong-letter' : '') : (isSel ? 'is-selected' : '');
            return <button key={o} type="button" className={`map-letter ${tone}`} disabled={!!review || busy} aria-pressed={isSel}
              onClick={() => setAnswers(a => ({ ...a, [id]: o }))}>{o}</button>;
          })}</div>
          {result && <p className={result.correct ? 'reading-correct' : 'reading-incorrect'}>{result.correct ? 'Correct' : `Accepted: ${result.accepted.join(' / ')}`} · Your answer: {result.answer || 'Unanswered'}</p>}
        </div>;
      })}</div>
    </div>;
  }

  // Matching: drag an option onto a slot (desktop), or tap an option then tap a slot (mobile).
  function matchBox(startId: number, options: Choice[], memberIds: number[]) {
    const assign = (id: number, letter: string) => { if (review || busy) return; setAnswers(a => ({ ...a, [id]: letter })); };
    return <div className="listening-matchbox" key={`mb-${startId}`}>
      <div className="matchbox-slots">{memberIds.map(id => {
        const q = data.questions.find(x => x.id === id)!;
        const sel = answers[id];
        const selOpt = options.find(o => o.letter === sel);
        const result = review?.results.find(r => r.id === id);
        return <div className="matchbox-row" id={`question-${id}`} key={id}>
          <div className="matchbox-prompt">
            <span><b>{id}</b> {gapify(q.prompt)}</span>
            <button title={`Flag question ${id} for review`} aria-label={`Flag question ${id} for review`} aria-pressed={flags.includes(id)} onClick={() => setFlags(f => f.includes(id) ? f.filter(n => n !== id) : [...f, id])}><Flag size={15} /></button>
          </div>
          <div
            className={`matchbox-drop ${selOpt ? 'is-filled' : ''} ${picked && !review ? 'is-armed' : ''} ${result ? (result.correct ? 'is-correct' : 'is-wrong') : ''}`}
            role="button" tabIndex={0} aria-label={`Answer ${id}`}
            onDragOver={e => { if (!review) e.preventDefault(); }}
            onDrop={e => { e.preventDefault(); const l = e.dataTransfer.getData('text/plain'); if (l) assign(id, l); }}
            onClick={() => { if (picked) { assign(id, picked); setPicked(null); } }}>
            {selOpt
              ? <span className="matchbox-chip"><b>{selOpt.letter}</b> {selOpt.text}{!review && <button className="matchbox-clear" aria-label={`Clear answer ${id}`} onClick={e => { e.stopPropagation(); setAnswers(a => ({ ...a, [id]: '' })); }}>×</button>}</span>
              : <span className="matchbox-placeholder">{picked ? `Tap to place ${picked}` : 'Drag or tap an option'}</span>}
          </div>
          {result && !result.correct && <p className="reading-incorrect">Accepted: {result.accepted.join(' / ')}</p>}
        </div>;
      })}</div>
      <div className="matchbox-options" aria-label="Options to choose from">{options.map(o => (
        <button key={o.letter} type="button" className={`matchbox-option ${picked === o.letter ? 'is-picked' : ''}`} disabled={!!review || busy}
          draggable={!review && !busy}
          onDragStart={e => e.dataTransfer.setData('text/plain', o.letter)}
          onClick={() => setPicked(p => (p === o.letter ? null : o.letter))}>
          <b>{o.letter}</b> {o.text}
        </button>
      ))}</div>
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
    setPart(q.part);
    window.setTimeout(() => document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'auto', block: 'center' }), 0);
  }

  return <div className="reading-test listening-test">
    <Link href="/practice/listening" className="reading-back"><ArrowLeft size={16} /> Listening collection</Link>
    <header className="reading-title"><p className="studio-eyebrow">ACADEMIC LISTENING · GUIDED PRACTICE</p><h1>{data.title}</h1><p>Four parts · {total} questions · answers saved on this device</p></header>
    <div className="reading-toolbar"><span><CheckCircle2 size={17} /> {answered} / {total} answered</span><span><Clock3 size={17} /> {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')} elapsed</span><button disabled={!!review} onClick={toggleTimer}>{running ? 'Pause timer' : 'Start timer'}</button><span>{saveStatus || 'Answers saved on this device'}</span></div>
    {review && <section className="reading-results" role="status"><h2>{review.score} / {review.total} correct</h2><p>Marked against the supplied answer key. This is a practice raw score, not an official IELTS band score.</p><button onClick={() => { setReview(null); setConfirm(false); }}>Edit answers and try again</button></section>}
    <nav className="reading-tabs" aria-label="Listening parts">{data.sections.map(s => <button key={s.part} aria-pressed={part === s.part} onClick={() => setPart(s.part)}>Part {s.part}<small>{s.subtitle}</small></button>)}</nav>

    <div className="listening-player">
      <div className="listening-player-head"><Headphones size={18} /><span>Part {section.part} audio{section.subtitle ? ` · ${section.subtitle}` : ''}</span></div>
      <audio key={section.part} controls preload="none" src={section.audio} className="listening-audio">Your browser does not support audio playback.</audio>
      <p className="listening-player-note">In the real test each recording is played once. For practice you may replay it. If the audio does not load yet, it is being prepared.</p>
    </div>

    <section className="reading-questions listening-questions" aria-label="Questions">{data.questions.filter(q => q.part === part).map(q => {
      if (blockIds.has(q.id) && !blockByStart[q.id]) return null;
      if (matchGroups.consumed.has(q.id) && !matchGroups.byStart[q.id]) return null;
      const g = data.groups[q.id];
      const header = g ? <header className="reading-group" key={`g-${q.id}`}><h3>{g.title}</h3><p>{g.instructions}</p></header> : null;
      const mg = matchGroups.byStart[q.id];
      const block = blockByStart[q.id];
      const body = mg ? matchBox(q.id, mg.options, mg.memberIds)
        : block && block.type === 'map' ? mapBlock(block)
        : normalQuestion(q);
      return <div key={q.id}>{header}{body}</div>;
    })}</section>

    <nav className="reading-question-nav" aria-label="Question navigation">{data.questions.map(q => <button key={q.id} disabled={q.kind === 'unavailable'} title={`Question ${q.id}`} aria-label={`Question ${q.id}${flags.includes(q.id) ? ', flagged' : ''}`} className={`${answers[q.id]?.trim() ? 'is-answered' : ''} ${flags.includes(q.id) ? 'is-flagged' : ''}`} onClick={() => navigateQuestion(q.id)}>{q.id}</button>)}</nav>
    <div className="reading-submit">{!review && !confirm && <button className="studio-primary" onClick={() => setConfirm(true)}>Review and submit answers</button>}{confirm && !review && <section aria-label="Confirm submission"><p>{answered} answered · {total - answered} unanswered. Submit all {total} questions for marking?</p><button className="studio-primary" disabled={busy} onClick={submit}>{busy ? 'Marking…' : 'Submit for marking'}</button><button disabled={busy} onClick={() => setConfirm(false)}>Keep practising</button></section>}{error && <p role="alert">{error}</p>}</div>
    <p className="reading-source">Audio and answer key supplied by the owner. {data.title}.</p>
  </div>;
}

export type { TestData as ListeningTestData };
