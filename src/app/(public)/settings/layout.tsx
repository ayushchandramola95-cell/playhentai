import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Settings | PlayHentai',
  description: 'Manage your PlayHentai account settings, update your password, and control your security preferences.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
