'use client';

import { useEffect, useState, type ElementType } from 'react';

/** Text whose words rise in one after another. Plain words stay in the DOM, so screen readers read it normally. */
export function WordsReveal({ text, as: Tag = 'span', className, delay = 0 }: { text: string; as?: ElementType; className?: string; delay?: number }) {
  const words = text.split(' ');
  return (
    <Tag className={`words-reveal${className ? ` ${className}` : ''}`}>
      {words.map((w, i) => (
        <span key={i}>
          <span className="w" style={{ animationDelay: `${delay + i * 0.06}s` }}>{w}</span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}

/** One word at a time from a list, swapping every few seconds with a red underline sweep. */
export function RotatingWord({ words, every = 2400 }: { words: string[]; every?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI(n => (n + 1) % words.length), every);
    return () => clearInterval(t);
  }, [words.length, every]);
  return (
    <>
      <span className="sr-only">{words.join(', ')}</span>
      <span className="rotating" aria-hidden="true"><span key={i} className="rw">{words[i]}</span></span>
    </>
  );
}

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts from 0 up to a number once it mounts (or when the value arrives). */
export function CountUp({ value, decimals = 0, ms = 1100 }: { value: number; decimals?: number; ms?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced()) { setN(value); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <>{n.toFixed(decimals)}</>;
}

/** One page-wide pointer listener: any `.spot` element gets --mx/--my for a cursor-following glow and tilt. */
export function SpotlightFx() {
  useEffect(() => {
    if (reduced()) return;
    const move = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('.spot') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
      el.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`);
      el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 6}deg`);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return null;
}

/** A band score line that draws itself, with points popping in: an example learner going from 5.5 to 7.5. */
export function BandChart() {
  const pts = [5.5, 6, 6, 6.5, 7, 7.5];
  const x = (i: number) => 20 + i * 56, y = (b: number) => 130 - (b - 5) * 44;
  const d = pts.map((b, i) => `${i ? 'L' : 'M'}${x(i)} ${y(b)}`).join(' ');
  return (
    <figure className="band-chart" aria-hidden="true">
      <svg viewBox="0 0 320 150">
        {[5, 6, 7, 8].map(b => <g key={b}><line x1="12" x2="308" y1={y(b)} y2={y(b)} /><text x="0" y={y(b) + 4}>{b}</text></g>)}
        <path className="area" d={`${d} L${x(pts.length - 1)} 140 L${x(0)} 140 Z`} />
        <path className="line" d={d} pathLength={1} />
        {pts.map((b, i) => <circle key={i} cx={x(i)} cy={y(b)} r={i === pts.length - 1 ? 6 : 4} style={{ animationDelay: `${0.9 + i * 0.18}s` }} className={i === pts.length - 1 ? 'last' : ''} />)}
      </svg>
      <figcaption>6 weeks of practice <b><CountUp value={7.5} decimals={1} ms={2000} /></b></figcaption>
    </figure>
  );
}

/** Endless strip of IELTS question types. */
export function Marquee({ items }: { items: string[] }) {
  const row = items.map((t, i) => <span key={i}>{t}</span>);
  return <div className="marquee" aria-hidden="true"><div className="marquee-track">{row}{row}</div></div>;
}
