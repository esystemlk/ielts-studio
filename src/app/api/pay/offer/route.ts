import { NextResponse } from 'next/server';
import { uidFrom } from '@/lib/admin.server';
import { isNewToPlans } from '@/lib/offer.server';
import { PLAN_PRICES } from '@/lib/plans';
import { PLUS_FIRST_MONTH_USD } from '@/lib/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** What Plus costs this student right now (for display; /api/pay/create decides the real charge). */
export async function GET(request: Request) {
  const who = await uidFrom(request);
  if (!who) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    const firstMonth = await isNewToPlans(who.uid);
    return NextResponse.json({ plusFirstMonth: firstMonth, plusPrice: firstMonth ? PLUS_FIRST_MONTH_USD : PLAN_PRICES.plus });
  } catch (e) {
    console.error('[pay/offer]', e);
    return NextResponse.json({ error: 'Could not check the offer.' }, { status: 500 });
  }
}
