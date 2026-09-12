import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In & Register | Play Hentai',
  description: 'Sign in to access your personal anime watchlist, favorited series, and streaming history on Play Hentai.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
