import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/admin.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TEMPORARY diagnostic: is server-side Firebase Admin usable? Reports yes/no and an error kind only, never values.
export async function GET() {
  const env = { adminConfig: !!process.env.FIREBASE_ADMIN_CONFIG, merchantId: !!process.env.NEXT_PUBLIC_PAYHERE_MERCHANT_ID, merchantSecret: !!process.env.PAYHERE_MERCHANT_SECRET };
  try {
    await adminAuth().verifyIdToken('not-a-real-token').catch(e => { if (!String(e?.code).startsWith('auth/argument-error')) throw e; });
    return NextResponse.json({ admin: 'ok', env });
  } catch (e) {
    console.error('[pay/health]', e);
    return NextResponse.json({ admin: 'error', kind: e instanceof SyntaxError ? 'config is not valid JSON' : (e as { code?: string })?.code ?? (e instanceof Error ? e.name : 'unknown'), env });
  }
}
