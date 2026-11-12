'use client';
// Creates or updates the shared users/{uid} profile after an IELTS Studio sign-in or sign-up.
// Role handling mirrors src/app/login and src/app/signup so accounts behave the same on both sites;
// keep ADMIN_EMAILS in step with those pages.
import type { User } from 'firebase/auth';
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { incrementStudentCount, logUserActivity } from '@/lib/signup-effects';

const ADMIN_EMAILS = ['admin@smartlabs.com', 'thimira.vishwa2003@gmail.com'];
const DEVELOPER_EMAIL = 'thimira.vishwa2003@gmail.com';

export interface StudioProfileExtras {
  displayName?: string;
  ieltsModule?: 'academic' | 'general' | 'unsure';
  ieltsTargetBand?: number;
  ieltsTestDate?: string; // yyyy-mm-dd
}

/** Returns the account's role so the caller can decide where to go next. */
export async function ensureStudioProfile(firestore: Firestore, user: User, extras: StudioProfileExtras = {}): Promise<string> {
  const ref = doc(firestore, 'users', user.uid);
  const snap = await getDoc(ref);
  const email = user.email || '';
  const adminRole = ADMIN_EMAILS.includes(email) ? (email === DEVELOPER_EMAIL ? 'developer' : 'admin') : null;
  const studyFields = Object.fromEntries(Object.entries({ ieltsModule: extras.ieltsModule, ieltsTargetBand: extras.ieltsTargetBand, ieltsTestDate: extras.ieltsTestDate }).filter(([, v]) => v !== undefined && v !== ''));

  if (!snap.exists()) {
    const role = adminRole ?? 'user';
    await setDoc(ref, {
      uid: user.uid, email: user.email, displayName: extras.displayName || user.displayName, photoURL: user.photoURL,
      role, createdAt: serverTimestamp(), lastLogin: serverTimestamp(), hasCompletedOnboarding: !!adminRole,
      signupSource: 'ielts-studio', apps: ['ielts-studio'], ...studyFields,
    });
    // Same side effects as Smart Labs sign-up; neither may block account creation.
    await Promise.allSettled([incrementStudentCount(), logUserActivity(user.uid, 'enrollment', 'Account Created', 'Welcome to IELTS Studio!', { role })]);
    return role;
  }

  const role = adminRole ?? (snap.data().role as string) ?? 'user';
  await updateDoc(ref, { lastLogin: serverTimestamp(), apps: arrayUnion('ielts-studio'), ...(adminRole ? { role: adminRole } : {}), ...studyFields });
  return role;
}
