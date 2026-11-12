import { adminDb } from './admin.server';

/**
 * "New student" for the first-month Plus offer: has never had a Studio plan payment go through
 * (Plus or Unlimited, including ones later charged back). Existing Smart Labs students count as new
 * until they buy a Studio plan.
 */
export async function isNewToPlans(uid: string): Promise<boolean> {
  const snap = await adminDb().collection('payment_orders').where('userId', '==', uid).where('type', '==', 'studio_plan').get();
  return !snap.docs.some(d => ['success', 'chargedback'].includes(d.data().paymentStatus));
}
