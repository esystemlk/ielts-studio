'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wordmark } from '@/components/ui';
import { EssayFeedback } from '@/components/mock/mock-runner';
import type { IeltsEssayResult } from '@/types/ielts-essay';
import '@/components/mock/mock.css';
import '@/app/writing/writing.css';

interface Task { prompt: string; image?: string; imageAlt?: string; visualType?: string }

const wordsOf = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** One Writing task: write (draft saved on this device), get AI feedback within the plan's limits. */
export function WritingPractice({ testN, title, task, t }: { testN: number; title: string; task: 1 | 2; t: Task }) {
  const db = useFirestore();
  const { user } = useUser();
  const draftKey = `studio-writing-${user?.uid}-${testN}-${task}`;
  const [text, setText] = useState('');
  const [result, setResult] = useState<IeltsEssayResult | null>(null);
  const [submitted, setSubmitted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [upgrade, setUpgrade] = useState(false);
  const [target, setTarget] = useState<number | undefined>();
  const [secs, setSecs] = useState(0);
  const started = useRef(false);
  const minWords = task === 1 ? 150 : 250, minutes = task === 1 ? 20 : 40;
  const words = wordsOf(text);

  // Load the saved draft, the student's target band, and (from history) a past marked answer.
  useEffect(() => {
    if (!user) return;
    try { setText(localStorage.getItem(draftKey) ?? ''); } catch { /* storage off: start empty */ }
    getDoc(doc(db, 'users', user.uid)).then(s => { const b = s.data()?.ieltsTargetBand; if (typeof b === 'number') setTarget(b); }).catch(() => {});
    const r = new URLSearchParams(window.location.search).get('r');
    if (r) getDoc(doc(db, 'users', user.uid, 'studio_writing', r)).then(s => { const d = s.data(); if (d?.result) { setResult(d.result); setSubmitted(d.response); } }).catch(() => {});
  }, [user, db, draftKey]);

  useEffect(() => { try { if (user) localStorage.setItem(draftKey, text); } catch { /* ignore */ } }, [text, draftKey, user]);

  // Practice clock starts with the first word typed.
  useEffect(() => {
    if (!text || started.current) return;
    started.current = true;
    const iv = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [text]);

  async function submit() {
    if (!user) return;
    setBusy(true); setError(''); setUpgrade(false);
    try {
      const res = await fetch('/api/writing', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ testN, task, response: text, targetBand: target }) });
      const data = await res.json();
      if (!res.ok) { setUpgrade(data.code === 'LIMIT'); throw new Error(data.error || 'Could not mark your answer.'); }
      setResult(data.result); setSubmitted(text);
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not mark your answer.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mk">
      <header className="mk-top"><Wordmark /><div className="mk-title"><small>Writing · {title}</small><b>Task {task} · {task === 1 ? 'Report' : 'Essay'}</b></div><Link className="btn secondary small" href="/writing">All tasks</Link></header>
      <div className="mk-body">
        {busy && <div className="mk-wait" role="status"><span className="mk-spin" /><h2>Marking your answer</h2><p className="muted">An AI examiner is reading it against the four IELTS criteria. This takes up to a minute.</p></div>}

        {!busy && result && (
          <div className="mk-narrow wide mk-result">
            <section className="mk-card mk-overall">
              <p className="label">Task {task} band</p>
              <p className="mk-big num">{result.overallBand}</p>
              <p className="mk-band-label">{result.bandLabel}</p>
              {result.overallExplanation && <p className="muted">{result.overallExplanation}</p>}
              {result.targetBandAnalysis && typeof target === 'number' && (
                <p className={`wr-target ${result.targetBandAnalysis.achieved ? 'ok' : ''}`}>{result.targetBandAnalysis.achieved ? `You reached your target of ${target}.` : `${result.targetBandAnalysis.gap} below your target of ${target}. Focus: ${result.targetBandAnalysis.studyPriority}`}</p>
              )}
            </section>
            <EssayFeedback r={result} question={t.prompt} response={submitted} />
            <p className="mk-actions"><button type="button" className="btn accent" onClick={() => { setResult(null); setText(''); started.current = false; setSecs(0); window.history.replaceState(null, '', window.location.pathname); }}>Write it again</button><Link className="btn secondary" href="/writing">Another task</Link></p>
          </div>
        )}

        {!busy && !result && (
          <div className="mk-write wr-page">
            <div className="mk-card mk-task">
              <p className="label">Writing Task {task}{t.visualType ? ` · ${t.visualType}` : ''} · about {minutes} minutes</p>
              <p className="mk-prompt">{t.prompt}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.image && <img className="mk-diagram" src={t.image} alt={t.imageAlt || 'Task 1 chart'} />}
            </div>
            <div>
              <div className="wr-bar">
                <span className={words >= minWords ? 'ok' : ''}><b className="num">{words}</b> words · aim for {minWords}+</span>
                <span className={secs > minutes * 60 ? 'over' : ''} title="Starts when you start typing">{fmt(secs)} / {minutes}:00</span>
              </div>
              <textarea className="mk-textarea" value={text} onChange={e => setText(e.target.value)} spellCheck={false}
                aria-label={`Your Task ${task} answer`} placeholder={task === 1 ? 'Describe the main features and make comparisons…' : 'Write your essay…'} />
              {error && <p role="alert" className="form-error">{error}</p>}
              {upgrade && <p><Link className="btn accent small" href="/">See plans</Link></p>}
              <button type="button" className="btn accent block" onClick={submit} disabled={words < 30}>Get my band and feedback</button>
              <p className="mk-hint">Your draft is saved on this device as you type. {words < 30 ? 'Write at least 30 words to get feedback.' : ''}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
