'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Bot } from './robot3d';

/**
 * "Bolt", the Studio helper: a small 3D robot that turns up at random — walking across the
 * bottom (stopping partway to turn, look at you and wave) or peeking in from the top, left,
 * right or bottom edge at a random spot. His head follows the cursor; a click shows a tip.
 * Never shown inside a running test, or when the visitor prefers reduced motion or hid him.
 */
type Act = 'walk-right' | 'walk-left' | 'peek-left' | 'peek-right' | 'peek-top' | 'peek-bottom';
const ACTS: Act[] = ['walk-right', 'walk-left', 'peek-left', 'peek-right', 'peek-top', 'peek-bottom'];
const PEEK_MS = 6500;
const SPEED = 85; // px per second, matched to his step length so feet don't slide much
const PAUSE_MS = 3000;
const TIPS = [
  'Listening and Reading tests for books 15–21 are free.',
  'In Listening, check your spelling. A misspelt answer is marked wrong.',
  'Reading tip: read the questions before the passage.',
  'Writing Task 2 is worth twice as much as Task 1.',
  'Steady practice beats one long session. Try a test a day!',
];
const OFF_KEY = 'studio-robot-off';
const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Show { act: Act; at: number; x?: number; dur?: number; walking?: boolean }

export function Robot() {
  const path = usePathname();
  const [show, setShow] = useState<Show | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [off, setOff] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bot = useRef<Bot | null>(null);
  const want = useRef<Parameters<Bot['set']>>(['wave', 'front']);
  const inTest = /^\/practice\/[^/]+\/[^/]+/.test(path ?? '');

  useEffect(() => {
    let hidden = false;
    try { hidden = localStorage.getItem(OFF_KEY) === '1'; } catch { /* storage blocked: show him */ }
    setOff(hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Shuffle: a random act each time (never the same twice running), at a random spot.
  useEffect(() => {
    if (off || inTest) { setShow(null); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    let last: Act | null = null;

    const done = () => { setShow(null); setTip(null); later(rand(8000, 20000), play); };
    const play = () => {
      const pool = ACTS.filter(a => a !== last);
      const act = pool[Math.floor(Math.random() * pool.length)];
      last = act;
      if (!act.startsWith('walk')) {
        // Top/bottom peeks pick a spot across the width; side peeks a height.
        setShow({ act, at: act === 'peek-top' || act === 'peek-bottom' ? rand(12, 82) : rand(14, 68) });
        return later(PEEK_MS, done);
      }
      // Walk: in from one side, stop somewhere in the middle, turn and wave, then walk off.
      const vw = window.innerWidth, toRight = act === 'walk-right';
      const start = toRight ? -130 : vw + 10, end = toRight ? vw + 10 : -130;
      const stop = vw * rand(0.3, 0.65);
      const leg1 = (Math.abs(stop - start) / SPEED) * 1000, leg2 = (Math.abs(end - stop) / SPEED) * 1000;
      setShow({ act, at: 0, x: start, dur: 0, walking: true });
      later(80, () => setShow(s => s && { ...s, x: stop, dur: leg1 }));
      later(80 + leg1, () => setShow(s => s && { ...s, walking: false }));
      later(80 + leg1 + PAUSE_MS, () => setShow(s => s && { ...s, x: end, dur: leg2, walking: true }));
      later(80 + leg1 + PAUSE_MS + leg2, done);
    };
    later(2500, play);
    return () => timers.forEach(clearTimeout);
  }, [off, inTest]);

  // Start the 3D scene when he appears (three.js is fetched the first time only).
  const visible = !!show;
  useEffect(() => {
    if (!visible || !canvas.current) return;
    let live = true;
    import('./robot3d').then(({ createBot }) => { if (live && canvas.current) { bot.current = createBot(canvas.current); bot.current.set(...want.current); } }).catch(() => setOff(true));
    const move = (e: PointerEvent) => {
      const r = canvas.current?.getBoundingClientRect();
      if (!r) return;
      bot.current?.look((e.clientX - (r.left + r.width / 2)) / 500, (e.clientY - (r.top + r.height * 0.3)) / 400);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { live = false; window.removeEventListener('pointermove', move); bot.current?.dispose(); bot.current = null; };
  }, [visible]);

  // Tell the model what to do: walk the way he's going, wave when stopped or peeking.
  const act = show?.act;
  const walking = !!show?.walking;
  useEffect(() => {
    if (!act) return;
    const moving = act.startsWith('walk') && walking;
    want.current = [moving ? 'walk' : 'wave', moving ? (act === 'walk-right' ? 'right' : 'left') : 'front'];
    bot.current?.set(...want.current); // if the scene is still loading, it picks this up on start
  }, [act, walking]);

  if (off || inTest || !show) return null;

  const hide = () => { try { localStorage.setItem(OFF_KEY, '1'); } catch { /* ignore */ } setOff(true); };
  const place: React.CSSProperties = show.act.startsWith('walk')
    ? { transform: `translateX(${show.x}px)`, transition: `transform ${show.dur}ms linear` }
    : show.act === 'peek-top' || show.act === 'peek-bottom' ? { left: `${show.at}%` } : { top: `${show.at}vh` };

  return (
    <div className={`robot robot-${show.act}`} style={place}>
      <div className="robot-flip" aria-hidden="true">
        <canvas ref={canvas} className="robot-body" width={128} height={160}
          onClick={() => { bot.current?.hop(); setTip(TIPS[Math.floor(Math.random() * TIPS.length)]); }} />
      </div>
      {tip && (
        <div className="robot-tip" role="status">
          <p>{tip}</p>
          <span><Link href="/practice/listening">Practise</Link><button type="button" onClick={hide}>Hide helper</button></span>
        </div>
      )}
    </div>
  );
}
