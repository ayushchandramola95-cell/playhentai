import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Settings | Play Hentai',
  description: 'Manage your Play Hentai account settings, update your password, and control your security preferences.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
