'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { RequireAuth } from '@/components/require-auth';
import { Wordmark } from '@/components/ui';
import { planLabel, planOf } from '@/lib/plans';
import { PRODUCTS, type ProductId } from '@/lib/products';

/** PayHere sends the student back here. Access is granted by PayHere's server notification, so we watch the profile until it lands. */
function PaymentResult() {
  const db = useFirestore();
  const { user } = useUser();
  const [q] = useState(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search));
  const product = PRODUCTS[q.get('product') as ProductId];
  const cancelled = q.get('status') === 'cancelled';
  const [start, setStart] = useState<Record<string, unknown> | null>(null);
  const [now, setNow] = useState<Record<string, unknown> | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!user || cancelled) return;
    const t = setTimeout(() => setSlow(true), 45_000);
    const off = onSnapshot(doc(db, 'users', user.uid), s => { const d = s.data() ?? {}; setStart(p => p ?? d); setNow(d); });
    return () => { off(); clearTimeout(t); };
  }, [db, user, cancelled]);

  // Done once the plan is active, or the credit count has gone up since this page opened.
  const done = !!product && !!now && (product.kind === 'plan'
    ? planOf(now) === product.plan
    : Number(now.ieltsMockPaidCredits ?? 0) > Number(start?.ieltsMockPaidCredits ?? 0));

  return (
    <>
      <div className="practice-top"><Wordmark /><Link className="btn secondary small" href="/dashboard">Dashboard</Link></div>
      <main className="soon" aria-live="polite">
        {cancelled ? (
          <><p className="label">Payment cancelled</p><h1>No payment was taken</h1><p className="muted">You can try again whenever you are ready.</p></>
        ) : done ? (
          <><p className="label">Payment received</p><h1>{product.kind === 'plan' ? `You are on ${planLabel[product.plan!]}` : 'Mock credits added'}</h1>
            <p className="muted">{product.kind === 'plan' ? 'Your plan is active for the next 30 days. Pay again before it ends to keep it.' : `You now have ${Number(now?.ieltsMockPaidCredits ?? 0)} mock test credits.`}</p></>
        ) : (
          <><p className="label">Confirming payment</p><h1>Almost there…</h1>
            <p className="muted">{slow ? 'PayHere is taking longer than usual. Your payment is safe: your plan or credits will appear on your dashboard as soon as PayHere confirms it.' : 'Waiting for PayHere to confirm your payment. This usually takes a few seconds.'}</p></>
        )}
        <p style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn accent" href={product?.kind === 'mock' ? '/mocks' : '/dashboard'}>{product?.kind === 'mock' ? 'Go to mock tests' : 'Go to dashboard'}</Link>
          <Link className="btn secondary" href="/">See plans</Link>
        </p>
      </main>
    </>
  );
}

export default function PaymentPage() {
  return <RequireAuth><PaymentResult /></RequireAuth>;
}
