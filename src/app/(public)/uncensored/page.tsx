import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Watch Uncensored Hentai Anime Series | PlayHentai',
  description: 'Stream 1080p uncensored hentai anime series and HD episodes online for free on PlayHentai.',
  alternates: {
    canonical: '/uncensored',
  },
};

export default function UncensoredPage() {
  redirect('/categories?genre=uncensored');
}
