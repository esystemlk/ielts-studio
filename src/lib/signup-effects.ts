'use client';
// The same two sign-up side effects smartlabs.lk records, written to the shared Firestore.
import { addDoc, collection, doc, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export async function incrementStudentCount(): Promise<void> {
  await updateDoc(doc(db, 'site_stats', 'global_stats'), { studentsCount: increment(1), lastUpdated: new Date() });
}

export async function logUserActivity(userId: string, activityType: string, title: string, description: string, metadata: Record<string, unknown> = {}): Promise<void> {
  await addDoc(collection(db, 'users', userId, 'activities'), { activityType, title, description, timestamp: new Date(), metadata });
}
