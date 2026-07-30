import React from 'react';
import { Metadata } from 'next';
import StatusCatalog, { fetchSeriesByStatus, buildStatusMetadata } from '@/components/StatusCatalog/StatusCatalog';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const series = await fetchSeriesByStatus('ongoing');
  return buildStatusMetadata('ongoing', series.length);
}

export default async function OngoingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <StatusCatalog status="ongoing" searchParams={sp} />;
}
