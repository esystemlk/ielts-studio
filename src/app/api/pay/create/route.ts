import { NextResponse } from 'next/server';
import { adminDb, uidFrom } from '@/lib/admin.server';
import { checkoutHash } from '@/lib/billing';
import { PRODUCTS, type ProductId } from '@/lib/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Creates a pending USD order and returns the signed PayHere checkout fields. */
export async function POST(request: Request) {
  try {
    const who = await uidFrom(request);
    if (!who) return NextResponse.json({ error: 'Please sign in to buy.', code: 'UNAUTHENTICATED' }, { status: 401 });

    const { productId } = await request.json().catch(() => ({}));
    const product = PRODUCTS[productId as ProductId];
    if (!product) return NextResponse.json({ error: 'Unknown product.' }, { status: 400 });

    const merchantId = process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID;
    const secret = process.env.PAYHERE_MERCHANT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ielts.smartlabs.lk';
    if (!merchantId || !secret) return NextResponse.json({ error: 'Payments are not set up yet.' }, { status: 500 });

    const db = adminDb();
    const profile = (await db.collection('users').doc(who.uid).get()).data() ?? {};
    const name = String(profile.displayName || 'Student').trim().split(/\s+/);
    const orderId = `studio_${product.id}_${who.uid.slice(0, 8)}_${Date.now()}`;
    const amount = product.usd.toFixed(2);
    const currency = 'USD';

    await db.collection('payment_orders').add({
      orderId, userId: who.uid, source: 'ielts-studio',
      type: product.kind === 'plan' ? 'studio_plan' : 'studio_mock_credits',
      productId: product.id, plan: product.plan ?? null, ieltsMockCredits: product.credits ?? 0,
      paymentAmount: product.usd, currency, paymentStatus: 'pending', createdAt: new Date(),
    });

    const params = {
      merchant_id: merchantId,
      return_url: `${appUrl}/payment?status=success&product=${product.id}`,
      cancel_url: `${appUrl}/payment?status=cancelled&product=${product.id}`,
      notify_url: `${appUrl}/api/pay/notify`,
      order_id: orderId, items: product.label, amount, currency,
      first_name: name[0] || 'Student', last_name: name.slice(1).join(' ') || '-',
      email: String(profile.email || who.email || ''), phone: '0000000000',
      address: 'N/A', city: 'Colombo', country: 'Sri Lanka',
      hash: checkoutHash(merchantId, orderId, amount, currency, secret),
    };
    return NextResponse.json({ params, checkout: 'https://www.payhere.lk/pay/checkout' });
  } catch (e) {
    console.error('[pay/create]', e);
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 500 });
  }
}
