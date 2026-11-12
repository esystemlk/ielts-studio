import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/admin.server';
import { notifySig, planExpiryAfterPayment } from '@/lib/billing';

export const runtime = 'nodejs';

const OK = () => new Response('OK', { status: 200 });

/**
 * PayHere server-to-server notification. Only this route grants anything, and only after the
 * signature, currency and amount check out. Idempotent: a repeated notification changes nothing.
 * Status codes: 2 success, 0 pending, -1 cancelled, -2 failed, -3 chargeback.
 */
export async function POST(request: Request) {
  try {
    const d = Object.fromEntries((await request.formData()).entries()) as Record<string, string>;
    const secret = process.env.PAYHERE_MERCHANT_SECRET;
    if (!secret) { console.error('[pay/notify] secret missing'); return OK(); }
    if (notifySig(d.merchant_id, d.order_id, d.payhere_amount, d.payhere_currency, d.status_code, secret) !== String(d.md5sig).toUpperCase()) {
      console.warn(`[pay/notify] bad signature for ${d.order_id}`);
      return OK();
    }

    const db = adminDb();
    const snap = await db.collection('payment_orders').where('orderId', '==', String(d.order_id)).limit(1).get();
    if (snap.empty) { console.warn(`[pay/notify] unknown order ${d.order_id}`); return OK(); }
    const orderRef = snap.docs[0].ref;
    const order = snap.docs[0].data();
    if (order.source !== 'ielts-studio') return OK();
    const userRef = db.collection('users').doc(order.userId);
    const status = String(d.status_code);

    if (status === '2') {
      if (d.payhere_currency !== 'USD' || Number(d.payhere_amount) < Number(order.paymentAmount) - 0.01) {
        console.error(`[pay/notify] amount/currency mismatch ${d.order_id}: ${d.payhere_amount} ${d.payhere_currency}`);
        await orderRef.update({ paymentStatus: 'amount_mismatch', amountPaid: d.payhere_amount, currencyPaid: d.payhere_currency, updatedAt: FieldValue.serverTimestamp() });
        return OK();
      }
      await db.runTransaction(async tx => {
        const fresh = (await tx.get(orderRef)).data();
        if (fresh?.paymentStatus === 'success' || fresh?.paymentStatus === 'chargedback') return;
        const grant: Record<string, unknown> = {};
        if (order.type === 'studio_plan') {
          const u = (await tx.get(userRef)).data() ?? {};
          const expiry = planExpiryAfterPayment({ plan: u.studioPlan, expiry: u.studioPlanExpiry?.toDate?.() ?? null }, order.plan);
          grant.studioPlan = order.plan;
          grant.studioPlanExpiry = Timestamp.fromDate(expiry);
        } else {
          // Same credit pool smartlabs.lk's mock tests spend from.
          grant.ieltsMockPaidCredits = FieldValue.increment(Number(order.ieltsMockCredits) || 0);
        }
        tx.update(userRef, grant);
        tx.update(orderRef, { paymentStatus: 'success', payherePaymentId: String(d.payment_id ?? ''), updatedAt: FieldValue.serverTimestamp() });
      });
      console.log(`[pay/notify] granted ${order.productId} to ${order.userId}`);
    } else if (status === '-3') {
      await db.runTransaction(async tx => {
        const fresh = (await tx.get(orderRef)).data();
        if (fresh?.paymentStatus !== 'success') { tx.update(orderRef, { paymentStatus: 'chargedback', updatedAt: FieldValue.serverTimestamp() }); return; }
        // Take back what the payment gave: end the plan now, or remove the credits.
        if (order.type === 'studio_plan') tx.update(userRef, { studioPlanExpiry: Timestamp.now() });
        else tx.update(userRef, { ieltsMockPaidCredits: FieldValue.increment(-(Number(order.ieltsMockCredits) || 0)) });
        tx.update(orderRef, { paymentStatus: 'chargedback', updatedAt: FieldValue.serverTimestamp() });
      });
      console.warn(`[pay/notify] chargeback ${d.order_id}`);
    } else if (status === '-1' || status === '-2') {
      const s = (await orderRef.get()).data()?.paymentStatus;
      if (s === 'pending') await orderRef.update({ paymentStatus: status === '-1' ? 'cancelled' : 'failed', updatedAt: FieldValue.serverTimestamp() });
    }
    return OK();
  } catch (e) {
    console.error('[pay/notify]', e);
    return OK();
  }
}
