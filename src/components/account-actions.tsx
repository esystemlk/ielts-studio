'use client';

import Link from 'next/link';
import { useUser } from '@/firebase';

/** Plans page header: the signed-in student's name and a Dashboard link, or Sign in / Sign up when signed out. */
export function AccountActions() {
  const { user, isUserLoading } = useUser();
  if (isUserLoading) return <span className="head-actions" aria-hidden="true" />;
  if (user) {
    const name = (user.displayName || user.email || '').split(/[\s@]/)[0];
    return (
      <span className="head-actions">
        {name && <span className="who">Signed in as <b>{name}</b></span>}
        <Link className="btn accent small" href="/dashboard">Go to dashboard</Link>
      </span>
    );
  }
  return (
    <span className="head-actions">
      <Link className="btn secondary small" href="/login">Sign in</Link>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <Link className="btn accent small signup-btn" href="/signup"><span className="signup-ic"><img src="/studio/signup.png" alt="" width={256} height={256} /></span>Sign up free</Link>
    </span>
  );
}

/** Free plan button: sign up when signed out; signed-in students already have Free. */
export function FreeCta() {
  const { user, isUserLoading } = useUser();
  if (!isUserLoading && user) return <Link className="btn secondary" href="/dashboard">You have Free · open dashboard</Link>;
  return <Link className="btn secondary" href="/signup">Create free account</Link>;
}
