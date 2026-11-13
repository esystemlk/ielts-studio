'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { Wordmark } from '@/components/ui';
import { EssayFeedback } from '@/components/mock/mock-runner';
import { ANSWER_SECONDS, PART2_PREP_SECONDS } from '@/lib/speaking/questions';
import type { SpeakingResult } from '@/lib/speaking/score.server';
import type { IeltsEssayResult } from '@/types/ielts-essay';
import '@/components/mock/mock.css';
import '@/app/writing/writing.css';
import '@/app/speaking/speaking.css';

type Rec = { blob: Blob; url: string; secs: number };
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** One Speaking part: record an answer per question, listen back, then get the band and feedback. */
export function SpeakingPractice({ testId, theme, part, questions, cue }: {
  testId: string; theme: string; part: 1 | 2 | 3; questions: string[];
  cue?: { task: string; points: string[]; finish: string };
}) {
  const { user } = useUser();
  const [i, setI] = useState(0);
  const [recs, setRecs] = useState<(Rec | null)[]>(() => questions.map(() => null));
  const [state, setState] = useState<'idle' | 'prep' | 'recording'>('idle');
  const [secs, setSecs] = useState(0);
  const [prep, setPrep] = useState(PART2_PREP_SECONDS);
  const [level, setLevel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const raf = useRef(0);
  const max = ANSWER_SECONDS[part];

  // Release the microphone when leaving the page.
  useEffect(() => () => { cancelAnimationFrame(raf.current); stream.current?.getTracks().forEach(t => t.stop()); }, []);

  // Part 2 preparation minute, then recording starts on its own.
  useEffect(() => {
    if (state !== 'prep') return;
    if (prep <= 0) { void start(); return; }
    const t = setTimeout(() => setPrep(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [state, prep]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state !== 'recording') return;
    if (secs >= max) { stop(); return; }
    const t = setTimeout(() => setSecs(s => s + 1), 1000);
    return () => clearTimeout(t);
  }, [state, secs, max]); // eslint-disable-line react-hooks/exhaustive-deps

  async function mic() {
    if (stream.current) return stream.current;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record audio. Please use Chrome, Edge or Safari.');
    stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    // Simple input level so students can see the microphone is hearing them.
    const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 256;
    ctx.createMediaStreamSource(stream.current).connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    const tick = () => { an.getByteFrequencyData(buf); setLevel(Math.min(1, buf.reduce((a, b) => a + b, 0) / buf.length / 90)); raf.current = requestAnimationFrame(tick); };
    tick();
    return stream.current;
  }

  async function start() {
    setError('');
    try {
      const s = await mic();
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(s, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32_000 });
      const chunks: BlobPart[] = [];
      const at = i;
      r.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      r.onstop = () => {
        const blob = new Blob(chunks, { type: r.mimeType || mime || 'audio/webm' });
        setRecs(prev => { const n = [...prev]; if (n[at]) URL.revokeObjectURL(n[at]!.url); n[at] = { blob, url: URL.createObjectURL(blob), secs: secsRef.current }; return n; });
      };
      rec.current = r; r.start(1000);
      setSecs(0); setState('recording');
    } catch (e) {
      setState('idle');
      setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow the microphone in your browser (the icon in the address bar), then try again.' : e instanceof Error ? e.message : 'Could not start recording.');
    }
  }
  const secsRef = useRef(0); secsRef.current = secs;
  function stop() { if (rec.current?.state === 'recording') rec.current.stop(); setState('idle'); }

  async function submit() {
    if (!user) return;
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.set('testId', testId); fd.set('part', String(part));
      recs.forEach((r, k) => { if (r) fd.set(`audio${k}`, r.blob, `answer${k}`); });
      const res = await fetch('/api/speaking', { method: 'POST', headers: { authorization: `Bearer ${await user.getIdToken()}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not mark your answers.');
      setResult(data.result);
      stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not mark your answers.'); }
    finally { setBusy(false); }
  }

  const done = recs.filter(Boolean).length;
  const head = <header className="mk-top"><Wordmark /><div className="mk-title"><small>Speaking · {theme}</small><b>Part {part}{part === 1 ? ' · Introduction' : part === 2 ? ' · Long turn' : ' · Discussion'}</b></div><Link className="btn secondary small" href="/speaking">All tests</Link></header>;

  if (busy) return <div className="mk">{head}<div className="mk-body"><div className="mk-wait" role="status"><span className="mk-spin" /><h2>Listening to your answers</h2><p className="muted">An AI examiner is listening to each recording and marking the four Speaking criteria. This takes up to a minute.</p></div></div></div>;

  if (result) return (
    <div className="mk">{head}
      <div className="mk-body"><div className="mk-narrow wide mk-result">
        <section className="mk-card mk-overall"><p className="label">Speaking Part {part} band</p><p className="mk-big num">{result.overallBand}</p><p className="mk-band-label">{result.bandLabel}</p><p className="muted">{result.overallExplanation}</p></section>
        <EssayFeedback r={result as unknown as IeltsEssayResult} />
        <section className="mk-card sp-answers">
          <h3>What you said, and a stronger answer</h3>
          {result.answers.map((a, k) => (
            <div key={k} className="sp-answer">
              <p className="sp-q">{a.question}</p>
              {recs[k] && <audio controls src={recs[k]!.url} />}
              <p className="mini">You said</p><p className="sp-said">{a.transcript || '(nothing could be heard)'}</p>
              <p className="mini">A Band 8 answer could sound like</p><p className="sp-better">{a.better}</p>
            </div>
          ))}
        </section>
        <p className="mk-actions"><button type="button" className="btn accent" onClick={() => { setResult(null); setRecs(questions.map(() => null)); setI(0); setPrep(PART2_PREP_SECONDS); }}>Try this part again</button><Link className="btn secondary" href="/speaking">Another test</Link></p>
        <p className="mk-hint">Estimated band for practice. Recordings stay on your device; only the transcript and feedback are saved.</p>
      </div></div>
    </div>
  );

  const r = recs[i];
  return (
    <div className="mk">{head}
      <div className="mk-body"><div className="mk-narrow">
        {questions.length > 1 && <ol className="sp-dots" aria-label="Questions">{questions.map((_, k) => <li key={k}><button type="button" className={`${k === i ? 'on' : ''}${recs[k] ? ' done' : ''}`} onClick={() => state === 'idle' && setI(k)} aria-label={`Question ${k + 1}${recs[k] ? ', recorded' : ''}`} aria-current={k === i ? 'step' : undefined}>{k + 1}</button></li>)}</ol>}

        <section className="mk-card sp-card">
          {part === 2 && cue ? (
            <div className="sp-cue"><p className="label">Cue card</p><p className="sp-task">{cue.task}</p><p className="muted">You should say:</p><ul>{cue.points.map(p => <li key={p}>{p}</li>)}</ul><p className="muted">{cue.finish}</p></div>
          ) : (
            <><p className="label">Question {i + 1} of {questions.length}</p><p className="sp-task">{questions[i]}</p></>
          )}

          <div className={`sp-stage ${state}`}>
            {state === 'prep' && <><p className="sp-big num">{prep}</p><p className="muted">Preparation time. Make notes if you like. Recording starts automatically.</p><button type="button" className="btn secondary small" onClick={() => setPrep(0)}>Start speaking now</button></>}
            {state === 'recording' && <><div className="sp-mic" style={{ '--lvl': level } as React.CSSProperties}><span /></div><p className="sp-big num">{fmt(secs)} <small>/ {fmt(max)}</small></p><button type="button" className="btn accent" onClick={stop}>Stop recording</button></>}
            {state === 'idle' && <>
              {r && <div className="sp-play"><audio controls src={r.url} /><span className="muted">{fmt(r.secs)} recorded</span></div>}
              <button type="button" className={`btn ${r ? 'secondary' : 'accent'}`} onClick={() => (part === 2 && !r ? (setPrep(PART2_PREP_SECONDS), setState('prep')) : start())}>
                {r ? 'Record again' : part === 2 ? 'Start 1-minute preparation' : 'Record my answer'}
              </button>
              <p className="mk-hint">Speak for up to {part === 1 ? '45 seconds' : part === 2 ? '2 minutes' : '90 seconds'}. Use headphones or a quiet room.</p>
            </>}
          </div>
        </section>

        {error && <p role="alert" className="form-error">{error}</p>}
        <div className="mk-foot">
          {questions.length > 1 && i + 1 < questions.length ? <button type="button" className="btn secondary" disabled={state !== 'idle'} onClick={() => setI(i + 1)}>Next question</button> : <span />}
          <button type="button" className="btn accent" disabled={!done || state !== 'idle'} onClick={submit}>Get my band{questions.length > 1 ? ` (${done}/${questions.length} answered)` : ''}</button>
        </div>
      </div></div>
    </div>
  );
}
