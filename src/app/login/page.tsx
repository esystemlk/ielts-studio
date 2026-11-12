'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, type User } from 'firebase/auth';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { ensureStudioProfile } from '@/lib/studio-auth';
import { safeRedirect } from '@/lib/studio';
import { WordsReveal, RotatingWord } from '@/components/motion';
import { AuthFooter, GoogleIcon, Wordmark, authErrorMessage } from '@/components/ui';

export default function StudioLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const next = () => safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
  // Already signed in (for example on this device earlier): go straight in.
  useEffect(() => { if (!isUserLoading && user && !busy) router.replace(next()); }, [user, isUserLoading, busy, router]);

  const finish = async (u: User) => { await ensureStudioProfile(firestore, u); router.push(next()); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(authErrorMessage(e)); setBusy(false); }
  };

  return (
    <div className="auth">
      <main className="auth-main">
        <header><Wordmark /></header>
        <form className="auth-form" onSubmit={e => { e.preventDefault(); void run(async () => finish((await signInWithEmailAndPassword(auth, email.trim(), password)).user)); }}>
          <WordsReveal as="h1" text="Welcome back" />
          <p>Sign in to continue your practice. Your Smart Labs account works here too.</p>

          <button type="button" className="btn secondary block" disabled={busy} onClick={() => run(async () => finish((await signInWithPopup(auth, new GoogleAuthProvider())).user))}>
            <GoogleIcon /> Continue with Google
          </button>
          <div className="divider">or with email</div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <div className="row-between"><label htmlFor="password">Password</label><Link href="/forgot-password" className="muted" style={{ fontSize: 13 }}>Forgot password?</Link></div>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="form-error">{error}</p>}
          <button className="btn block" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p style={{ marginTop: 24, fontSize: 14, color: 'var(--ink-2)' }}>New to IELTS Studio? <Link href="/signup">Create an account</Link></p>
        </form>
        <AuthFooter />
      </main>

      <aside className="auth-aside" aria-label="About IELTS band scores">
        <span className="aside-ghost" aria-hidden="true">9.0</span>
        <p className="label" style={{ margin: '0 0 10px' }}>How your work is marked</p>
        <p className="aside-rotate">Practise <RotatingWord words={['Listening', 'Reading', 'Writing', 'Speaking']} /> the way the test marks it.</p>
        <WordsReveal as="h2" delay={0.2} text="Practise against the same 9-band scale the test uses." />
        <div className="band-scale">
          <div><b className="num">8</b><p><strong>Very good user</strong>Handles complex language well, with only occasional slips.</p></div>
          <div><b className="num">7</b><p><strong>Good user</strong>Copes with detailed reasoning; some mistakes in unfamiliar situations.</p></div>
          <div><b className="num">6</b><p><strong>Competent user</strong>Generally effective, with some inaccuracies and misunderstandings.</p></div>
          <div><b className="num">5</b><p><strong>Modest user</strong>Gets the overall meaning in most situations, with frequent errors.</p></div>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: '18px 0 0' }}>Full mocks give a band for Listening, Reading and Writing, and an overall average of the three.</p>
      </aside>
    </div>
  );
}
