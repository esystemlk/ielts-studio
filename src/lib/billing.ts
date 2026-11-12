import { createHash } from 'crypto';
import { PLAN_DAYS } from './products';

export const md5 = (s: string) => createHash('md5').update(s).digest('hex').toUpperCase();

/** PayHere checkout hash: MD5(merchant_id + order_id + amount + currency + MD5(secret)). */
export const checkoutHash = (merchantId: string, orderId: string, amount: string, currency: string, secret: string) =>
  md5(merchantId + orderId + amount + currency + md5(secret));

/** PayHere notify signature: MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(secret)). */
export const notifySig = (merchantId: string, orderId: string, amount: string, currency: string, status: string, secret: string) =>
  md5(merchantId + orderId + amount + currency + status + md5(secret));

/**
 * When a paid month ends. Renewing the same plan early adds the month on top of what is left;
 * a new or different plan (e.g. Plus to Unlimited) starts its month now.
 */
export function planExpiryAfterPayment(current: { plan?: string; expiry?: Date | null }, plan: string, now = new Date()): Date {
  const base = current.plan === plan && current.expiry && current.expiry > now ? current.expiry : now;
  return new Date(base.getTime() + PLAN_DAYS * 86_400_000);
}
