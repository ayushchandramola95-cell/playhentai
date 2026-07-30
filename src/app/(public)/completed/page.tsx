import React from 'react';
import { Metadata } from 'next';
import StatusCatalog, { fetchSeriesByStatus, buildStatusMetadata } from '@/components/StatusCatalog/StatusCatalog';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const series = await fetchSeriesByStatus('completed');
  return buildStatusMetadata('completed', series.length);
}

export default async function CompletedPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <StatusCatalog status="completed" searchParams={sp} />;
}
