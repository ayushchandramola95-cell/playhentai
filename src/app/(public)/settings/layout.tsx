import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Settings | HentaiKage',
  description: 'Manage your HentaiKage account settings, update your password, and control your security preferences.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
