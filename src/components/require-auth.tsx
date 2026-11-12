'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

/** Free plan still needs an account: send signed-out visitors to sign in, then back here. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => { if (!isUserLoading && !user) router.replace(`/login?redirect=${encodeURIComponent(path)}`); }, [user, isUserLoading, router, path]);
  if (isUserLoading || !user) return <p className="main" role="status">Loading…</p>;
  return <>{children}</>;
}
