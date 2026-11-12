import { NextResponse } from 'next/server';

/**
 * Mock tests run on smartlabs.lk's own mock API, so credits, attempts, AI Writing marking,
 * the result email and the admin dashboard stay in one place. This forwards the student's
 * request server-to-server (no CORS), passing their Firebase ID token through untouched:
 * smartlabs.lk verifies it and does all the work. Studio holds no secrets for this.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 200; // Writing is AI-marked; smartlabs.lk allows up to 160s

const MAIN = process.env.SMARTLABS_API_ORIGIN || 'https://www.smartlabs.lk';
const ROUTES: Record<string, { path: string; method: 'GET' | 'POST' }> = {
  start: { path: '/api/ielts-mock/start', method: 'POST' },
  score: { path: '/api/ielts-mock/score', method: 'POST' },
  review: { path: '/api/ielts-mock/review', method: 'GET' },
  'dev-answers': { path: '/api/ielts-mock/dev-answers', method: 'GET' },
  balance: { path: '/api/ielts-mock-credits/balance', method: 'GET' },
};

async function forward(request: Request, action: string) {
  const route = ROUTES[action];
  if (!route || route.method !== request.method) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Please sign in.', code: 'UNAUTHENTICATED' }, { status: 401 });

  const url = new URL(route.path, MAIN);
  new URL(request.url).searchParams.forEach((v, k) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url, {
      method: route.method,
      headers: { authorization: auth, ...(route.method === 'POST' ? { 'content-type': 'application/json' } : {}) },
      body: route.method === 'POST' ? await request.text() : undefined,
      cache: 'no-store',
    });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
  } catch (e) {
    console.error(`[mock/${action}] forward failed`, e);
    return NextResponse.json({ error: 'The mock service could not be reached. Please try again.' }, { status: 502 });
  }
}

type Ctx = { params: Promise<{ action: string }> };
export async function GET(request: Request, { params }: Ctx) { return forward(request, (await params).action); }
export async function POST(request: Request, { params }: Ctx) { return forward(request, (await params).action); }
