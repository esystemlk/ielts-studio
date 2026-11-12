import '@/components/ielts/ielts-base.css';
import { RequireAuth } from '@/components/require-auth';
import { Wordmark } from '@/components/ui';

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="practice-top"><Wordmark /><a className="btn secondary small" href="/dashboard">Dashboard</a></div>
      <div className="ielts-studio">{children}</div>
    </RequireAuth>
  );
}
