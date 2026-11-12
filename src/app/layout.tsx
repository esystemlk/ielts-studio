import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'IELTS Studio', template: '%s · IELTS Studio' },
  description: 'Free IELTS Listening and Reading practice with instant results. AI feedback, Speaking and Writing on Plus and Unlimited.',
  icons: { icon: '/studio/logo.png' },
  // Not indexed until launch.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fonts load in the browser (no next/font): build-time Google Fonts downloads broke deploys. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
