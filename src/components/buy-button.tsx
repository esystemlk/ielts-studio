'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import type { ProductId } from '@/lib/products';

/** Starts a USD PayHere checkout for one product. Signed-out visitors go to sign up first, then back here. */
export function BuyButton({ productId, className = 'btn', children }: { productId: ProductId; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function buy() {
    if (isUserLoading) return; // still restoring the sign-in: do not treat as signed out
    if (!user) { router.push(`/signup?redirect=${encodeURIComponent(`${window.location.pathname}?buy=${productId}`)}`); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/pay/create', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ productId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start the payment.');
      // PayHere checkout is a plain form POST to their page.
      const form = document.createElement('form');
      form.method = 'post'; form.action = data.checkout;
      for (const [k, v] of Object.entries(data.params as Record<string, string>)) {
        const input = document.createElement('input'); input.type = 'hidden'; input.name = k; input.value = v; form.appendChild(input);
      }
      document.body.appendChild(form); form.submit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the payment.');
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={buy} disabled={busy || isUserLoading}>{busy ? 'Opening PayHere…' : children}</button>
      {error && <p role="alert" className="form-error" style={{ marginTop: 8 }}>{error}</p>}
    </>
  );
}
