'use client';
// Shared IELTS Studio pieces: logo, generated icons (with dark-mode variants) and the Google button.
import Link from 'next/link';

export type StudioIcon = 'logo' | 'listening' | 'reading' | 'writing' | 'speaking' | 'mocks' | 'results' | 'credits' | 'badge-free' | 'badge-paid' | 'signout';

/** Transparent PNG icon; the white-ink "-dark" version is used when the device is in dark mode. */
export function Pic({ name, className = 'ic', alt = '' }: { name: StudioIcon; className?: string; alt?: string }) {
  return (
    <picture className={className}>
      <source srcSet={`/studio/${name}-dark.png`} media="(prefers-color-scheme: dark)" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/studio/${name}.png`} alt={alt} width={256} height={256} />
    </picture>
  );
}

export function Wordmark({ href = '/dashboard', badge = true }: { href?: string; badge?: boolean }) {
  return (
    <Link className="wordmark" href={href}>
      <Pic name="logo" className="mark" alt="" />
      <b>IELTS Studio</b>
      {badge && <span>by Smart Labs</span>}
    </Link>
  );
}

export function GoogleIcon() {
  return (
    <svg className="google-g" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6.1C12.3 13.6 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z" />
      <path fill="#FBBC05" d="M10.4 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.4 0-11.7-4.1-13.6-9.9l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function AuthFooter() {
  return (
    <footer>
      <span>© {new Date().getFullYear()} Smart Labs</span>
      <Link href="/policies">Privacy</Link>
      <Link href="/policies">Terms</Link>
      <Link href="/support">Help</Link>
    </footer>
  );
}

/** Friendly messages for the Firebase Auth errors students actually hit. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  if (['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-email'].includes(code)) return 'That email and password don’t match. Check them and try again.';
  if (code === 'auth/email-already-in-use') return 'An account already uses this email. Sign in instead.';
  if (code === 'auth/weak-password') return 'Choose a password with at least 8 characters.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a few minutes, or reset your password.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  if (code === 'auth/network-request-failed') return 'No connection. Check your internet and try again.';
  return 'Something went wrong. Please try again.';
}
