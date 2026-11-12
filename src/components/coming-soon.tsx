import Link from 'next/link';
import { Wordmark } from '@/components/ui';

/** Placeholder for features planned for the next build steps, so no link is a dead end. */
export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <>
      <div className="practice-top"><Wordmark /><Link className="btn secondary small" href="/dashboard">Dashboard</Link></div>
      <main className="soon">
        <p className="label">Coming soon</p>
        <h1>{title}</h1>
        <p className="muted">{text}</p>
        <p style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn accent" href="/practice/listening">Practise Listening</Link>
          <Link className="btn secondary" href="/">See plans</Link>
        </p>
      </main>
    </>
  );
}
