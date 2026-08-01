import React from 'react';
import { Metadata } from 'next';
import StatusCatalog, { fetchSeriesByStatus, buildStatusMetadata } from '@/components/StatusCatalog/StatusCatalog';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const series = await fetchSeriesByStatus('upcoming');
  return buildStatusMetadata('upcoming', series.length);
}

export default async function UpcomingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  return <StatusCatalog status="upcoming" searchParams={sp} />;
}
