'use client';
// Same Firebase project as smartlabs.lk: same accounts, same Firestore, same Storage.
import { useEffect, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const useAuth = () => auth;
export const useFirestore = () => db;

/** Same shape as the Smart Labs hook, so the copied practice screens work unchanged. */
export function useUser(): { user: User | null; isUserLoading: boolean } {
  const [state, setState] = useState<{ user: User | null; isUserLoading: boolean }>({ user: auth.currentUser, isUserLoading: !auth.currentUser });
  useEffect(() => onAuthStateChanged(auth, user => setState({ user, isUserLoading: false })), []);
  return state;
}
