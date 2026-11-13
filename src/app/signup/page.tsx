'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, createUserWithEmailAndPassword, signInWithPopup, updateProfile, type User } from 'firebase/auth';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { safeRedirect } from '@/lib/studio';
import { ensureStudioProfile, type StudioProfileExtras } from '@/lib/studio-auth';
import { WordsReveal, RotatingWord, Marquee } from '@/components/motion';
import { AuthFooter, GoogleIcon, Wordmark, authErrorMessage } from '@/components/ui';

const BANDS = [5.5, 6, 6.5, 7, 7.5, 8, 8.5];

export default function StudioSignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [form, setForm] = useState({ name: '', email: '', password: '', module: 'academic', target: '7', date: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const next = () => safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
  useEffect(() => { if (!isUserLoading && user && !busy) router.replace(next()); }, [user, isUserLoading, busy, router]);

  const study: StudioProfileExtras = { ieltsModule: form.module as StudioProfileExtras['ieltsModule'], ieltsTargetBand: Number(form.target), ieltsTestDate: form.date || undefined };
  const finish = async (u: User, displayName?: string) => { await ensureStudioProfile(firestore, u, { ...study, displayName }); router.push(next()); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(authErrorMessage(e)); setBusy(false); }
  };

  return (
    <div className="auth">
      <main className="auth-main">
        <header><Wordmark /></header>
        <form className="auth-form" onSubmit={e => {
          e.preventDefault();
          if (form.name.trim().length < 2) { setError('Enter your full name.'); return; }
          if (form.password.length < 8) { setError('Choose a password with at least 8 characters.'); return; }
          void run(async () => {
            const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
            await updateProfile(cred.user, { displayName: form.name.trim() });
            await finish(cred.user, form.name.trim());
          });
        }}>
          <WordsReveal as="h1" text="Create your account" />
          <p>One account for IELTS Studio and Smart Labs. Already have one? <Link href="/login">Sign in</Link> instead.</p>

          <button type="button" className="btn secondary block" disabled={busy} onClick={() => run(async () => finish((await signInWithPopup(auth, new GoogleAuthProvider())).user))}>
            <GoogleIcon /> Sign up with Google
          </button>
          <div className="divider">or with email</div>

          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" autoComplete="name" required value={form.name} onChange={set('name')} aria-describedby="name-hint" />
            <span className="hint" id="name-hint">As it should appear on your score reports.</span>
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" placeholder="you@example.com" required value={form.email} onChange={set('email')} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={set('password')} aria-describedby="pw-hint" />
            <span className="hint" id="pw-hint">At least 8 characters.</span>
          </div>
          <div className="pair">
            <div className="field">
              <label htmlFor="module">Test type</label>
              <select id="module" value={form.module} onChange={set('module')}><option value="academic">Academic</option><option value="general">General Training</option><option value="unsure">Not sure yet</option></select>
            </div>
            <div className="field">
              <label htmlFor="target">Target band</label>
              <select id="target" value={form.target} onChange={set('target')}>{BANDS.map(b => <option key={b} value={String(b)}>{b.toFixed(1)}{b === 8.5 ? '+' : ''}</option>)}</select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="date">Test date <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
            <input id="date" type="date" value={form.date} onChange={set('date')} min={new Date().toISOString().slice(0, 10)} aria-describedby="date-hint" />
            <span className="hint" id="date-hint">We use this to show a countdown on your dashboard. You can change it later.</span>
          </div>
          {error && <p role="alert" className="form-error">{error}</p>}
          <button className="btn block" type="submit" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>By creating an account you agree to the <Link href="/policies">Terms</Link> and <Link href="/policies">Privacy Policy</Link>.</p>
        </form>
        <AuthFooter />
      </main>

      <aside className="auth-aside" aria-label="What is included">
        <span className="aside-ghost" aria-hidden="true">7.5</span>
        <p className="label" style={{ margin: '0 0 10px' }}>What you get</p>
        <p className="aside-rotate">Practise <RotatingWord words={['Listening', 'Reading', 'Writing', 'Speaking']} /> the way the test marks it.</p>
        <WordsReveal as="h2" delay={0.2} text="Everything you need for Listening, Reading and Writing, in one place." />
        <div className="band-scale">
          {/* eslint-disable @next/next/no-img-element */}
          <div><img className="aside-ic" src="/studio/mocks-dark.png" alt="" width={256} height={256} /><p><strong>4 full mock tests</strong>Timed like test day, with a band for each skill and an overall average.</p></div>
          <div><img className="aside-ic" src="/studio/reading-dark.png" alt="" width={256} height={256} /><p><strong>3 skills with practice sets</strong>Listening and Reading by part and question type; Writing Task 1 and Task 2.</p></div>
          <div><img className="aside-ic" src="/studio/credits-dark.png" alt="" width={256} height={256} /><p><strong>1 account for both sites</strong>Credits, results and purchases are shared with Smart Labs.</p></div>
          {/* eslint-enable @next/next/no-img-element */}
        </div>
        <p className="muted" style={{ fontSize: 13, margin: '18px 0 0' }}>Speaking practice is coming soon.</p>
        <Marquee items={['Multiple choice', 'Matching headings', 'True / False / Not given', 'Map labelling', 'Sentence completion', 'Form completion', 'Summary completion', 'Matching features', 'Short answers', 'Diagram labelling']} />
      </aside>
    </div>
  );
}
