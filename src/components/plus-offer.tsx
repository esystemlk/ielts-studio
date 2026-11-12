'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { BuyButton } from '@/components/buy-button';
import { PLAN_PRICES } from '@/lib/plans';
import { PLUS_FIRST_MONTH_USD } from '@/lib/products';

/**
 * Plus price + buy button. New students (never bought a Studio plan) see the first-month price;
 * signed-out visitors see it too, since a new account is new. The server decides the real charge.
 */
export function PlusOffer() {
  const { user } = useUser();
  const [eligible, setEligible] = useState(true);

  useEffect(() => {
    if (!user) { setEligible(true); return; }
    let live = true;
    user.getIdToken().then(t => fetch('/api/pay/offer', { headers: { authorization: `Bearer ${t}` } }))
      .then(r => r.json()).then(d => { if (live && typeof d.plusFirstMonth === 'boolean') setEligible(d.plusFirstMonth); }).catch(() => {});
    return () => { live = false; };
  }, [user]);

  return (
    <>
      {eligible ? (
        <>
          <div className="price"><b>${PLUS_FIRST_MONTH_USD}</b><span>first month</span></div>
          <p className="renew offer"><span className="offer-tag">New student offer</span> then ${PLAN_PRICES.plus} / month · pay each month to keep it</p>
        </>
      ) : (
        <>
          <div className="price"><b>${PLAN_PRICES.plus}</b><span>/ month</span></div>
          <p className="renew">Monthly package · pay each month to keep it</p>
        </>
      )}
      <p className="plan-note">Find out exactly where you lose marks, part by part.</p>
      <BuyButton productId="plus" className="btn accent">{eligible ? `Get Plus · $${PLUS_FIRST_MONTH_USD} first month` : `Get Plus · $${PLAN_PRICES.plus}`}</BuyButton>
    </>
  );
}
