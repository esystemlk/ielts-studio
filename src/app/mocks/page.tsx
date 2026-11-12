'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { RequireAuth } from '@/components/require-auth';
import { Wordmark } from '@/components/ui';
import { BuyButton } from '@/components/buy-button';
import { IELTS_MOCKS } from '@/lib/ielts-mock/mocks';
import '@/components/mock/mock.css';

interface Attempt { mockId: string; status: string; overall?: number }

function Mocks() {
  const db = useFirestore();
  const { user } = useUser();
  const [credits, setCredits] = useState<{ unlimited: boolean; remaining: number } | null>(null);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    user.getIdToken().then(t => fetch('/api/mock/balance', { headers: { authorization: `Bearer ${t}` } }))
      .then(r => r.json()).then(d => { if (live && typeof d.remaining === 'number') setCredits(d); }).catch(() => {});
    getDocs(query(collection(db, 'users', user.uid, 'ielts_mock_attempts'), orderBy('startedAt', 'desc')))
      .then(s => live && setAttempts(s.docs.map(d => ({ mockId: d.data().mockId, status: d.data().status, overall: d.data().overall }))))
      .catch(() => live && setAttempts([]));
    return () => { live = false; };
  }, [user, db]);

  const done = (id: string) => (attempts ?? []).filter(a => a.mockId === id && a.status === 'completed' && typeof a.overall === 'number');

  return (
    <div className="mk">
      <header className="mk-top"><Wordmark /><div className="mk-title"><small>IELTS Studio</small><b>Mock tests</b></div><Link className="btn secondary small" href="/dashboard">Dashboard</Link></header>
      <div className="mk-body">
        <section className="mk-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/studio/art/mock.webp" alt="" width={800} height={600} />
          <div>
            <p className="label">Full mock tests</p>
            <h1>Sit the whole test, timed like test day</h1>
            <p className="muted">Listening, Reading and Writing in one sitting. You get a band for each skill, an overall band, AI feedback on your Writing and a PDF report by email.</p>
            <div className="mk-credits">
              <div><span>Your credits</span><b className="num">{credits === null ? '—' : credits.unlimited ? 'Unlimited' : credits.remaining}</b></div>
              <div className="mk-buy"><BuyButton productId="mock-1" className="btn accent small">1 mock · $5</BuyButton><BuyButton productId="mock-3" className="btn secondary small">3 · $15</BuyButton><BuyButton productId="mock-5" className="btn secondary small">5 · $25</BuyButton></div>
            </div>
            <p className="mk-hint left">1 credit = 1 full mock test. Credits are shared with your Smart Labs account and don&apos;t expire while you keep using it.</p>
          </div>
        </section>

        <div className="mk-list">
          {IELTS_MOCKS.map((m, i) => {
            const runs = done(m.id);
            const best = runs.reduce<number | null>((b, a) => (b === null || a.overall! > b ? a.overall! : b), null);
            return (
              <Link key={m.id} href={`/mocks/${m.id}`} className="mk-card mk-item spot" style={{ '--i': i } as React.CSSProperties}>
                <span className="mk-num num">{i + 1}</span>
                <div>
                  <h3>{m.title}</h3>
                  <p className="muted">Listening: {m.listening.label}<br />Reading: {m.reading.label}<br />Writing: {m.writingLabel}</p>
                </div>
                <div className="mk-item-foot">
                  {best !== null ? <span className="mk-done">Best band <b className="num">{best}</b>{runs.length > 1 ? ` · ${runs.length} attempts` : ''}</span> : <span className="muted">Not taken yet</span>}
                  <span className="go">Open →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MocksPage() {
  return <RequireAuth><Mocks /></RequireAuth>;
}
