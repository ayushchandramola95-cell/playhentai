import React from 'react';
import CategoriesPage, { generateMetadata as baseGenerateMetadata } from '../page';
import { tagToSlug } from '@/utils/constants';

interface GenrePageProps {
  params: Promise<{ genre: string }>;
  searchParams: Promise<{
    sort?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ params, searchParams }: GenrePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const searchParamsWithGenre = Promise.resolve({
    ...resolvedSearchParams,
    genre: resolvedParams.genre
  });
  
  const metadata = await baseGenerateMetadata({ searchParams: searchParamsWithGenre });
  
  // Overwrite the canonical path to use the clean genre path
  const genre = resolvedParams.genre;
  const page = resolvedSearchParams.page;
  
  let canonicalPath = `/categories/${tagToSlug(genre)}`;
  if (page && page !== '1') {
    canonicalPath += `?page=${page}`;
  }
  
  return {
    ...metadata,
    alternates: {
      canonical: canonicalPath
    },
    openGraph: {
      ...metadata.openGraph,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://playhentai.live'}${canonicalPath}`
    }
  };
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  // Inject the genre parameter from clean path into searchParams for base CategoriesPage component
  const searchParamsWithGenre = Promise.resolve({
    ...resolvedSearchParams,
    genre: resolvedParams.genre
  });
  
  return <CategoriesPage searchParams={searchParamsWithGenre} />;
}
