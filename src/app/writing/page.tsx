'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { RequireAuth } from '@/components/require-auth';
import { Wordmark } from '@/components/ui';
import { CAMBRIDGE_21_WRITING } from '@/lib/ielts-writing/cambridge-21';
import type { Allowance } from '@/lib/writing/limits';
import '@/components/mock/mock.css';
import './writing.css';

interface Past { id: string; testN: number; task: number; band: number; at: Date | null }

const allowText = (a?: Allowance) => !a ? '…' : !a.ok ? 'Not on your plan today' : a.left === null ? 'No daily limit' : `${a.left + 1} left today`;

function Writing() {
  const db = useFirestore();
  const { user } = useUser();
  const [allow, setAllow] = useState<{ plan: string; task1: Allowance; task2: Allowance } | null>(null);
  const [past, setPast] = useState<Past[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    user.getIdToken().then(t => fetch('/api/writing', { headers: { authorization: `Bearer ${t}` } })).then(r => r.json()).then(d => live && d.plan && setAllow(d)).catch(() => {});
    getDocs(query(collection(db, 'users', user.uid, 'studio_writing'), orderBy('createdAt', 'desc'), limit(10)))
      .then(s => live && setPast(s.docs.map(d => ({ id: d.id, testN: d.data().testN, task: d.data().task, band: d.data().band, at: d.data().createdAt?.toDate?.() ?? null }))))
      .catch(() => live && setPast([]));
    return () => { live = false; };
  }, [user, db]);

  const free = allow?.plan === 'free';
  return (
    <div className="mk">
      <header className="mk-top"><Wordmark /><div className="mk-title"><small>Practice</small><b>Writing</b></div><Link className="btn secondary small" href="/dashboard">Dashboard</Link></header>
      <div className="mk-body">
        <section className="wr-intro">
          <div>
            <p className="label">Writing practice</p>
            <h1>Write, then see exactly where your band comes from</h1>
            <p className="muted">Every answer is marked on the four official criteria, with what went well, what to fix and how to reach the next band.</p>
          </div>
          <div className="wr-allow">
            <div><span>Task 1 · Report</span><b>{allowText(allow?.task1)}</b></div>
            <div><span>Task 2 · Essay</span><b>{free && allow?.task2.ok ? '1 free essay' : allowText(allow?.task2)}</b></div>
            {free && <Link className="btn accent small" href="/">Get Plus for 5 a day</Link>}
          </div>
        </section>

        <div className="wr-grid">
          {CAMBRIDGE_21_WRITING.map(t => (
            <article key={t.n} className="mk-card wr-test">
              <h3>Cambridge {t.book} · {t.title}</h3>
              <Link className="wr-task spot" href={`/writing/${t.n}/1`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.task1.image} alt="" loading="lazy" />
                <div><small>Task 1 · {t.task1.visualType} · 20 min · 150+ words</small><p>{t.task1.prompt.split('\n')[0]}</p></div>
                {free && <span className="wr-lock">Plus</span>}
              </Link>
              <Link className="wr-task spot" href={`/writing/${t.n}/2`}>
                <div className="wr-quote">“</div>
                <div><small>Task 2 · Essay · 40 min · 250+ words</small><p>{t.task2.prompt.split('\n').find(l => l.trim()) }</p></div>
              </Link>
            </article>
          ))}
        </div>

        <section className="mk-card wr-history">
          <div className="mk-head"><h3>Your marked answers</h3></div>
          {past === null ? <p className="muted">Loading…</p> : past.length === 0 ? <p className="muted">Nothing marked yet. Your answers and bands will appear here.</p> : (
            <ul>{past.map(p => (
              <li key={p.id}><Link href={`/writing/${p.testN}/${p.task}?r=${p.id}`}><span>Cambridge 21 · Test {p.testN} · Task {p.task}</span><span className="muted">{p.at?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><b className="num">{p.band}</b></Link></li>
            ))}</ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default function WritingPage() {
  return <RequireAuth><Writing /></RequireAuth>;
}
