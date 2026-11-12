'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { AuthFooter, Wordmark, authErrorMessage } from '@/components/ui';

export default function StudioForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="auth">
      <main className="auth-main">
        <header><Wordmark /></header>
        <div className="auth-form">
          {sent ? (
            <div role="status">
              <h1>Check your email</h1>
              <p>If an account uses <b>{email}</b>, we&rsquo;ve sent a link to reset its password. It works for both IELTS Studio and Smart Labs.</p>
              <Link className="btn block" href="/login">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={async e => {
              e.preventDefault(); setBusy(true); setError('');
              try { await sendPasswordResetEmail(auth, email.trim()); setSent(true); }
              // Do not reveal whether an account exists: "not found" still shows the sent screen.
              catch (err) { if ((err as { code?: string }).code === 'auth/user-not-found') setSent(true); else setError(authErrorMessage(err)); }
              finally { setBusy(false); }
            }}>
              <h1>Reset your password</h1>
              <p>Enter the email you sign in with and we&rsquo;ll send you a reset link.</p>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <p role="alert" className="form-error">{error}</p>}
              <button className="btn block" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
              <p style={{ marginTop: 24, fontSize: 14 }}><Link href="/login">Back to sign in</Link></p>
            </form>
          )}
        </div>
        <AuthFooter />
      </main>
      <aside className="auth-aside" aria-hidden="true">
        <p className="label" style={{ margin: '0 0 10px' }}>One account</p>
        <h2>Your IELTS Studio password is the same as your Smart Labs password.</h2>
      </aside>
    </div>
  );
}
