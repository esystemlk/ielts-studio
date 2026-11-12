// Self-check for payment logic. Run: npx tsx src/lib/billing.test.ts
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { checkoutHash, notifySig, planExpiryAfterPayment } from './billing';

const m = (s: string) => createHash('md5').update(s).digest('hex').toUpperCase();
// Same formula smartlabs.lk uses for its LKR orders.
assert.equal(checkoutHash('1234', 'o1', '15.00', 'USD', 'sec'), m('1234o115.00USD' + m('sec')));
assert.equal(notifySig('1234', 'o1', '15.00', 'USD', '2', 'sec'), m('1234o115.00USD2' + m('sec')));

const day = 86_400_000, now = new Date('2026-11-12T00:00:00Z');
const in10 = new Date(now.getTime() + 10 * day);
// New plan: 30 days from now.
assert.equal(planExpiryAfterPayment({}, 'plus', now).getTime(), now.getTime() + 30 * day);
// Early renewal of the same plan stacks on the days left.
assert.equal(planExpiryAfterPayment({ plan: 'plus', expiry: in10 }, 'plus', now).getTime(), in10.getTime() + 30 * day);
// Switching plan starts fresh from now.
assert.equal(planExpiryAfterPayment({ plan: 'plus', expiry: in10 }, 'unlimited', now).getTime(), now.getTime() + 30 * day);
// An expired plan does not stack.
assert.equal(planExpiryAfterPayment({ plan: 'plus', expiry: new Date(now.getTime() - day) }, 'plus', now).getTime(), now.getTime() + 30 * day);
console.log('billing self-check passed');
