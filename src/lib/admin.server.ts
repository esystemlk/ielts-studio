import admin from 'firebase-admin';

/** Firebase Admin for Studio's own server routes (payments). Same project and service account as smartlabs.lk. */
function init() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_ADMIN_CONFIG;
  if (!raw) throw new Error('FIREBASE_ADMIN_CONFIG is not set');
  return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw) as admin.ServiceAccount) });
}

export const adminDb = () => init().firestore();
export const adminAuth = () => init().auth();

/** The signed-in user's uid from "Authorization: Bearer <Firebase ID token>", or null. */
export async function uidFrom(request: Request): Promise<{ uid: string; email?: string } | null> {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try { const t = await adminAuth().verifyIdToken(h.slice(7)); return { uid: t.uid, email: t.email }; } catch { return null; }
}
