import React from 'react';
import { notFound } from 'next/navigation';
import CategoriesPage, { generateMetadata as baseGenerateMetadata } from '../../categories/page';
import { tagToSlug } from '@/utils/constants';

interface GenrePageProps {
  params: Promise<{ genre: string }>;
  searchParams: Promise<{
    sort?: string;
    page?: string;
  }>;
}

export const revalidate = 120;

export async function generateMetadata({ params, searchParams }: GenrePageProps) {
  const { genre } = await params;
  const resolvedSearchParams = await searchParams;

  const searchParamsWithGenre = Promise.resolve({
    ...resolvedSearchParams,
    genre: genre,
  });

  const metadata = await baseGenerateMetadata({ searchParams: searchParamsWithGenre });
  const cleanGenre = tagToSlug(genre);
  const page = resolvedSearchParams.page;

  let canonicalPath = `/genres/${cleanGenre}`;
  if (page && page !== '1') {
    canonicalPath += `?page=${page}`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hentaikage.cc';

  return {
    ...metadata,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      ...metadata.openGraph,
      url: `${siteUrl}${canonicalPath}`,
    },
  };
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const { genre } = await params;
  const resolvedSearchParams = await searchParams;

  const searchParamsWithGenre = Promise.resolve({
    ...resolvedSearchParams,
    genre: genre,
  });

  return <CategoriesPage searchParams={searchParamsWithGenre} />;
}
