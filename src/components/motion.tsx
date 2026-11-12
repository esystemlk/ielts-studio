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
