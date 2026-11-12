'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { RequireAuth } from '@/components/require-auth';
import { Pic, Wordmark } from '@/components/ui';
import { CountUp, WordsReveal } from '@/components/motion';
import { PLAN_PRICES, planLabel, planOf } from '@/lib/plans';

type Profile = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
interface MockResult { title: string; overall: number; listening: { band: number }; reading: { band: number }; writing: { band: number } }

const band = (n?: number) => (typeof n === 'number' ? n.toFixed(1) : '—');
const daysUntil = (iso?: string) => {
  if (!iso) return null;
  const ms = new Date(`${iso}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 86400000) : null;
};
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

function Dashboard() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mocks, setMocks] = useState<{ id: string; result: MockResult; at: Date | null }[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    // Same users/{uid} profile and mock history as smartlabs.lk.
    getDoc(doc(db, 'users', user.uid)).then(s => live && setProfile(s.data() ?? {})).catch(() => live && setProfile({}));
    getDocs(query(collection(db, 'users', user.uid, 'ielts_mock_attempts'), orderBy('startedAt', 'desc'), limit(20)))
      .then(s => live && setMocks(s.docs.map(d => ({ id: d.id, result: d.data().result, at: d.data().completedAt?.toDate?.() ?? null })).filter(m => m.result)))
      .catch(() => live && setMocks([]));
    return () => { live = false; };
  }, [user, db]);

  const plan = planOf(profile);
  const latest = mocks?.[0]?.result;
  const name = (profile?.displayName || user?.displayName || user?.email || '').split(' ')[0];
  const countdown = daysUntil(profile?.ieltsTestDate);
  const target = profile?.ieltsTargetBand as number | undefined;
  const mockCredits = (profile?.ieltsMockPaidCredits as number | undefined) ?? 0;
  const badge = plan === 'free' ? 'badge-free' : 'badge-paid';
  const skills = useMemo(() => [
    { id: 'listening', name: 'Listening', href: '/practice/listening', note: 'Free · books 15–21' },
    { id: 'reading', name: 'Reading', href: '/practice/reading', note: 'Free · books 15–21' },
    { id: 'writing', name: 'Writing', href: '/writing', note: plan === 'free' ? '1 free essay' : plan === 'plus' ? '5 a day per task' : 'No daily limit' },
    { id: 'speaking', name: 'Speaking', href: '/speaking', note: plan === 'free' ? 'Plus and Unlimited' : 'Included in your plan' },
  ] as const, [plan]);

  return (
    <div className="app">
      <aside className="side">
        <Wordmark />
        <nav aria-label="Main">
          <Link href="/dashboard" aria-current="page">Dashboard</Link>
          <p>Practice</p>
          {skills.map((s, i) => <Link key={s.id} href={s.href} style={{ '--i': i + 2 } as React.CSSProperties}><span className="nl"><Pic name={s.id} className={s.id === 'speaking' && plan === 'free' ? 'ic faded' : 'ic'} />{s.name}</span></Link>)}
          <p>Tests</p>
          <Link href="/mocks"><span className="nl"><Pic name="mocks" />Mock tests</span><small>${PLAN_PRICES.mock}</small></Link>
          <p>Account</p>
          <Link href="/"><span className="nl"><Pic name="credits" />Plans</span></Link>
          <button type="button" className="nav-button" onClick={() => signOut(auth).then(() => router.replace('/login'))}>Sign out</button>
        </nav>
        <div className="me">
          <div className="me-row"><Pic name={badge} className="me-badge" alt={`${planLabel[plan]} plan`} /><div>{profile?.displayName || user?.email}<span>{profile?.ieltsModule === 'general' ? 'General Training' : 'Academic'}{target ? ` · target ${band(target)}` : ''}</span></div></div>
          <Link className={`plan-chip${plan === 'free' ? ' free' : ''}`} href="/">{plan === 'free' ? 'Free plan · Upgrade' : `${planLabel[plan]} plan`}</Link>
        </div>
      </aside>

      <div>
        <div className="topbar"><Wordmark badge={false} /><span className="top-right"><Pic name={badge} className="top-badge" alt={`${planLabel[plan]} plan`} /><Link className="btn secondary small" href="/">Plans</Link></span></div>
        <main className="main">
          <section className="greeting" aria-labelledby="hello">
            <div>
              <p className="date">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <WordsReveal as="h1" text={`${greeting()}${name ? `, ${name}` : ''}`} key={name} />
              <p className="plan-line"><Pic name={badge} className="plan-badge" />{planLabel[plan]} plan{plan === 'free' ? ' · Listening and Reading are free' : ''}</p>
            </div>
            <div className="facts">
              <div><span>Target</span><b className="num">{target ? <CountUp value={target} decimals={1} /> : <small>Not set</small>}</b></div>
              <div><span>Latest mock</span><b className="num">{latest ? <CountUp value={latest.overall} decimals={1} /> : <small>None yet</small>}</b></div>
              <div><span>Test day</span><b className="num">{countdown !== null ? <><CountUp value={countdown} /> <small>{countdown === 1 ? 'day' : 'days'}</small></> : <small>Not set</small>}</b></div>
            </div>
          </section>

          <section className="section" aria-labelledby="next">
            <div className="continue">
              <div>
                <p className="label" style={{ margin: 0 }}>Start practising</p>
                <h3 id="next">Free Listening and Reading tests, books 15–21</h3>
                <p>Timed like the real test, with your score and the correct answers as soon as you finish.</p>
              </div>
              <Link className="btn accent" href="/practice/listening">Start Listening</Link>
            </div>
          </section>

          <section className="section" aria-labelledby="skills-h">
            <div className="section-head"><h2 id="skills-h">Your skills</h2><span className="muted" style={{ fontSize: 14 }}>{latest ? 'Bands from your latest mock' : 'Bands appear after a mock test'}</span></div>
            <div className="skills">
              {skills.map((s, i) => {
                const r = latest && (s.id === 'listening' || s.id === 'reading' || s.id === 'writing') ? latest[s.id] : null;
                const locked = s.id === 'speaking' && plan === 'free';
                return (
                  <Link key={s.id} className={`skill spot${locked ? ' locked' : ''}`} href={locked ? '/' : s.href} style={{ '--i': i } as React.CSSProperties}>
                    <Pic name={s.id} className={locked ? 'skill-ic faded' : 'skill-ic'} />
                    <h3>{s.name}</h3>
                    {r ? <><span className="band num"><CountUp value={r.band} decimals={1} /> <small>/ 9</small></span><span className="band-bar"><i style={{ '--w': `${(r.band / 9) * 100}%` } as React.CSSProperties} /></span></> : <span className="band soon-band">{locked ? 'Plus plan' : 'No mock yet'}</span>}
                    <p>{s.note}</p>
                    <span className="go">{locked ? 'See plans →' : 'Open →'}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="two section">
            <section aria-labelledby="results-h">
              <div className="section-head"><h2 id="results-h" className="ic-head"><Pic name="results" />Mock results</h2></div>
              {mocks === null ? <p className="empty" role="status">Loading…</p> : mocks.length === 0 ? <p className="empty">No mock results yet. Your bands appear here after a full mock test.</p> : (
                <table className="list">
                  <thead><tr><th scope="col">Mock</th><th scope="col" className="hide-sm">Date</th><th scope="col">Overall</th></tr></thead>
                  <tbody>{mocks.slice(0, 6).map((m, i) => (
                    <tr key={m.id} style={{ '--i': i } as React.CSSProperties}><td>{m.result.title}<br /><span className="muted" style={{ fontSize: 13 }}>L {band(m.result.listening?.band)} · R {band(m.result.reading?.band)} · W {band(m.result.writing?.band)}</span></td><td className="hide-sm num muted">{m.at?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td><td className="score num">{band(m.result.overall)}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </section>
            <section className="panel spot" aria-labelledby="credits-h">
              <h3 id="credits-h" className="ic-head"><Pic name="credits" />Your plan</h3>
              <div className="credit-row"><span>Plan</span><b>{planLabel[plan]}</b></div>
              <div className="credit-row"><span>Mock test credits</span><b className="num">{profile ? <CountUp value={mockCredits} /> : '—'}</b></div>
              <p className="muted" style={{ fontSize: 13, margin: '10px 0 14px' }}>Same account as Smart Labs. Mock tests are ${PLAN_PRICES.mock} each.</p>
              <Link className="btn secondary small block" href="/">{plan === 'free' ? 'See plans' : 'Manage plan'}</Link>
            </section>
          </div>
        </main>
      </div>

      <nav className="tabbar" aria-label="Main">
        <Link href="/dashboard" aria-current="page">Home</Link>
        <Link href="/practice/listening">Listening</Link>
        <Link href="/practice/reading">Reading</Link>
        <Link href="/writing">Writing</Link>
        <Link href="/mocks">Mocks</Link>
      </nav>
    </div>
  );
}

export default function DashboardPage() {
  return <RequireAuth><Dashboard /></RequireAuth>;
}
