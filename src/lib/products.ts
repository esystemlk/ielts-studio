// What Studio sells, in USD. Client-safe (no server imports): the plans page reads it too,
// and the server only ever charges the price listed here, never one sent by the browser.
import { PLAN_PRICES } from './plans';

export type ProductId = 'plus' | 'unlimited' | 'mock-1' | 'mock-3' | 'mock-5';
export interface Product { id: ProductId; label: string; usd: number; kind: 'plan' | 'mock'; plan?: 'plus' | 'unlimited'; credits?: number }

export const PRODUCTS: Record<ProductId, Product> = {
  plus: { id: 'plus', label: 'IELTS Studio Plus · 1 month', usd: PLAN_PRICES.plus, kind: 'plan', plan: 'plus' },
  unlimited: { id: 'unlimited', label: 'IELTS Studio Unlimited · 1 month', usd: PLAN_PRICES.unlimited, kind: 'plan', plan: 'unlimited' },
  'mock-1': { id: 'mock-1', label: 'IELTS Studio · 1 mock test credit', usd: PLAN_PRICES.mock, kind: 'mock', credits: 1 },
  'mock-3': { id: 'mock-3', label: 'IELTS Studio · 3 mock test credits', usd: PLAN_PRICES.mock * 3, kind: 'mock', credits: 3 },
  'mock-5': { id: 'mock-5', label: 'IELTS Studio · 5 mock test credits', usd: PLAN_PRICES.mock * 5, kind: 'mock', credits: 5 },
};

/** One paid month of a plan. */
export const PLAN_DAYS = 30;
