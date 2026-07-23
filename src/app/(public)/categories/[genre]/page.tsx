import { redirect } from 'next/navigation';

interface GenrePageProps {
  params: Promise<{ genre: string }>;
}

export default async function GenrePage({ params }: GenrePageProps) {
  const resolvedParams = await params;
  const genreSlug = resolvedParams.genre;
  
  // Clean up casing/format and redirect to unified query filter hub
  redirect(`/categories?genre=${encodeURIComponent(genreSlug)}`);
}
