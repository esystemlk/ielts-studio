'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { RequireAuth } from '@/components/require-auth';
import { Wordmark } from '@/components/ui';
import { SPEAKING_TESTS } from '@/lib/speaking/questions';
import type { Allowance } from '@/lib/writing/limits';
import '@/components/mock/mock.css';
import '../writing/writing.css';
import './speaking.css';

interface Past { id: string; testId: string; part: number; band: number; at: Date | null }

function Speaking() {
  const db = useFirestore();
  const { user } = useUser();
  const [info, setInfo] = useState<{ plan: string; allowance: Allowance } | null>(null);
  const [past, setPast] = useState<Past[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    user.getIdToken().then(t => fetch('/api/speaking', { headers: { authorization: `Bearer ${t}` } })).then(r => r.json()).then(d => live && d.plan && setInfo(d)).catch(() => {});
    getDocs(query(collection(db, 'users', user.uid, 'studio_speaking'), orderBy('createdAt', 'desc'), limit(8)))
      .then(s => live && setPast(s.docs.map(d => ({ id: d.id, testId: d.data().testId, part: d.data().part, band: d.data().band, at: d.data().createdAt?.toDate?.() ?? null }))))
      .catch(() => live && setPast([]));
    return () => { live = false; };
  }, [user, db]);

  const locked = info?.plan === 'free';
  return (
    <div className="mk">
      <header className="mk-top"><Wordmark /><div className="mk-title"><small>Practice</small><b>Speaking</b></div><Link className="btn secondary small" href="/dashboard">Dashboard</Link></header>
      <div className="mk-body">
        <section className="wr-intro sp-intro">
          <div>
            <p className="label">Speaking practice</p>
            <h1>Speak, listen back, and see your band</h1>
            <p className="muted">Answer real-style questions out loud. An AI examiner listens and marks Fluency, Vocabulary, Grammar and Pronunciation, shows what it heard, and gives you a stronger answer to learn from.</p>
          </div>
          <div className="wr-allow">
            {locked ? (<>
              <div><span>Your plan</span><b>Free</b></div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>Speaking is included in Plus and Unlimited.</p>
              <Link className="btn accent small" href="/">Get Plus</Link>
            </>) : (<>
              <div><span>Marked answers today</span><b>{!info ? '…' : info.allowance.ok ? `${(info.allowance.left ?? 0) + 1} left` : 'Limit reached'}</b></div>
              <div><span>How it works</span><b>3 parts per test</b></div>
            </>)}
          </div>
        </section>

        <div className="wr-grid">
          {SPEAKING_TESTS.map((t, k) => (
            <article key={t.id} className="mk-card wr-test" style={{ animationDelay: `${k * 60}ms` }}>
              <p className="label" style={{ margin: 0 }}>Test {k + 1}</p>
              <h3>{t.theme}</h3>
              {([1, 2, 3] as const).map(p => (
                <Link key={p} href={locked ? '/' : `/speaking/${t.id}/${p}`} className="sp-part spot">
                  <span className="sp-num">{p}</span>
                  <span><small>{p === 1 ? `Part 1 · ${t.part1.topic} · 4 questions` : p === 2 ? 'Part 2 · Cue card · 1 min prep, 2 min talk' : 'Part 3 · Discussion · 4 questions'}</small>{p === 2 ? t.part2.task : p === 1 ? t.part1.questions[0] : t.part3[0]}</span>
                  {locked && <span className="wr-lock">Plus</span>}
                </Link>
              ))}
            </article>
          ))}
        </div>

        {!locked && (
          <section className="mk-card wr-history">
            <div className="mk-head"><h3>Your recent Speaking bands</h3></div>
            {past === null ? <p className="muted">Loading…</p> : past.length === 0 ? <p className="muted">Nothing marked yet. Pick a test above and record your first answer.</p> : (
              <ul>{past.map(p => {
                const t = SPEAKING_TESTS.find(x => x.id === p.testId);
                return <li key={p.id}><span className="sp-row"><span>{t?.theme ?? 'Speaking'} · Part {p.part}</span><span className="muted">{p.at?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><b className="num">{p.band}</b></span></li>;
              })}</ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default function SpeakingPage() {
  return <RequireAuth><Speaking /></RequireAuth>;
}
